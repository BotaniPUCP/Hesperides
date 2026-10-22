package pe.edu.pucp.hesperides.modules.maps.service;

import java.awt.Desktop;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.Executors;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import tools.jackson.databind.ObjectMapper;

/**
 * Convierte una colección GeoJSON de secciones en una página HTML autosuficiente
 * que representa sus polígonos como figuras SVG.
 *
 * <p>Uso: {@code JsonToHtmlFigureTransformer <archivo-json> [puerto]}.</p>
 * El contenido de las secciones se toma íntegramente del archivo recibido; no se
 * codifican nombres, categorías ni coordenadas en esta clase.
 */
public final class JsonToHtmlFigureTransformer {

    private static final String LOCAL_HOST = "127.0.0.1";
    private static final int DEFAULT_PORT = 8081;
    private static final int HTTP_SUCCESS = 200;

    private final ObjectMapper objectMapper;

    public JsonToHtmlFigureTransformer(ObjectMapper objectMapper) {
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper is required");
    }

    /**
     * Punto de entrada independiente de Spring para previsualizar un archivo local.
     */
    public static void main(String[] arguments) throws IOException {
        if (arguments.length < 1 || arguments.length > 2) {
            throw new IllegalArgumentException("Usage: JsonToHtmlFigureTransformer <json-file> [port]");
        }

        Path inputFile = Path.of(arguments[0]).toAbsolutePath().normalize();
        int port = arguments.length == 2 ? parsePort(arguments[1]) : DEFAULT_PORT;
        String html = new JsonToHtmlFigureTransformer(new ObjectMapper()).transform(inputFile);
        startLocalServer(html, port);
    }

    /**
     * Lee el archivo GeoJSON y devuelve un documento HTML autosuficiente.
     */
    public String transform(Path inputFile) throws IOException {
        if (!Files.isRegularFile(inputFile)) {
            throw new IllegalArgumentException("The JSON input file does not exist: " + inputFile);
        }

        Map<String, Object> document = objectMapper.readValue(inputFile.toFile(), Map.class);
        List<Feature> features = parseFeatures(document);
        Bounds bounds = Bounds.from(features);
        return renderHtml(document, features, bounds);
    }

    private static void startLocalServer(String html, int port) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(LOCAL_HOST, port), 0);
        server.createContext("/", exchange -> respondWithHtml(exchange, html));
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.start();

        URI previewUrl = URI.create("http://" + LOCAL_HOST + ":" + port + "/");
        System.out.println("Preview available at " + previewUrl);
        openInBrowser(previewUrl);
    }

    private static void openInBrowser(URI previewUrl) {
        if (!Desktop.isDesktopSupported() || !Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
            return;
        }
        try {
            Desktop.getDesktop().browse(previewUrl);
        } catch (IOException exception) {
            System.err.println("Unable to open the browser. Use " + previewUrl);
        }
    }

    private static void respondWithHtml(HttpExchange exchange, String html) throws IOException {
        byte[] response = html.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
        exchange.sendResponseHeaders(HTTP_SUCCESS, response.length);
        try (exchange; var output = exchange.getResponseBody()) {
            output.write(response);
        }
    }

    private static int parsePort(String rawPort) {
        try {
            int port = Integer.parseInt(rawPort);
            if (port < 1 || port > 65_535) {
                throw new IllegalArgumentException("Port must be between 1 and 65535");
            }
            return port;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Port must be numeric", exception);
        }
    }

    @SuppressWarnings("unchecked")
    private static List<Feature> parseFeatures(Map<String, Object> document) {
        Object rawFeatures = document.get("features");
        if (!(rawFeatures instanceof List<?> featureList) || featureList.isEmpty()) {
            throw new IllegalArgumentException("The GeoJSON document must contain at least one feature");
        }

        List<Feature> features = new ArrayList<>();
        for (Object rawFeature : featureList) {
            if (!(rawFeature instanceof Map<?, ?> feature)) {
                throw new IllegalArgumentException("Each feature must be a JSON object");
            }

            Map<String, Object> properties = asObject(feature.get("properties"), "feature.properties");
            Map<String, Object> geometry = asObject(feature.get("geometry"), "feature.geometry");
            if (!"Polygon".equals(geometry.get("type"))) {
                throw new IllegalArgumentException("Only Polygon geometries are supported");
            }

            Object rawCoordinates = geometry.get("coordinates");
            if (!(rawCoordinates instanceof List<?> rings) || rings.isEmpty()) {
                throw new IllegalArgumentException("A polygon must contain an exterior ring");
            }

            List<Point> exteriorRing = parseExteriorRing(rings.getFirst());
            String id = requiredText(feature.get("id"), "feature.id");
            String name = requiredText(properties.get("name"), "feature.properties.name");
            String category = textOrEmpty(properties.get("category"));
            features.add(new Feature(id, name, category, exteriorRing, properties));
        }
        return List.copyOf(features);
    }

    private static List<Point> parseExteriorRing(Object rawRing) {
        if (!(rawRing instanceof List<?> ring) || ring.size() < 4) {
            throw new IllegalArgumentException("A polygon exterior ring must contain at least four coordinates");
        }

        List<Point> points = new ArrayList<>();
        for (Object rawCoordinate : ring) {
            if (!(rawCoordinate instanceof List<?> coordinate) || coordinate.size() < 2
                    || !(coordinate.get(0) instanceof Number longitude)
                    || !(coordinate.get(1) instanceof Number latitude)) {
                throw new IllegalArgumentException("Each coordinate must begin with numeric longitude and latitude");
            }
            points.add(new Point(longitude.doubleValue(), latitude.doubleValue()));
        }
        return List.copyOf(points);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asObject(Object value, String fieldName) {
        if (!(value instanceof Map<?, ?> map)) {
            throw new IllegalArgumentException(fieldName + " must be a JSON object");
        }
        return (Map<String, Object>) map;
    }

    private static String requiredText(Object value, String fieldName) {
        String text = textOrEmpty(value);
        if (text.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return text;
    }

    private static String textOrEmpty(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static String renderHtml(Map<String, Object> document, List<Feature> features, Bounds bounds) {
        String documentTitle = documentTitle(document);
        StringBuilder figureMarkup = new StringBuilder();
        StringBuilder legendMarkup = new StringBuilder();

        for (Feature feature : features) {
            String color = colorFor(feature.category());
            figureMarkup.append("<polygon id=\"").append(escape(feature.id()))
                    .append("\" points=\"").append(svgPoints(feature.points(), bounds))
                    .append("\" fill=\"").append(color).append("\" fill-opacity=\"0.55\"")
                    .append(" stroke=\"").append(color).append("\" stroke-width=\"2\">")
                    .append("<title>").append(escape(feature.name())).append("</title></polygon>");
            legendMarkup.append("<li><span style=\"background:").append(color).append("\"></span><strong>")
                    .append(escape(feature.name())).append("</strong>")
                    .append(feature.category().isBlank() ? "" : " — " + escape(feature.category()))
                    .append("</li>");
        }

        return """
                <!doctype html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>%s</title>
                  <style>
                    body { font-family: system-ui, sans-serif; margin: 2rem; color: #1f2937; }
                    main { max-width: 1100px; margin: auto; }
                    svg { width: 100%%; height: auto; border: 1px solid #d1d5db; border-radius: .5rem; background: #f9fafb; }
                    polygon { cursor: pointer; transition: fill-opacity .15s; }
                    polygon:hover { fill-opacity: .85; }
                    ul { list-style: none; padding: 0; display: grid; gap: .5rem; }
                    li span { display: inline-block; width: 1rem; height: 1rem; margin-right: .5rem; vertical-align: middle; border-radius: .15rem; }
                  </style>
                </head>
                <body><main>
                  <h1>%s</h1>
                  <svg viewBox="0 0 1000 1000" role="img" aria-label="Section figures">%s</svg>
                  <h2>Figures</h2><ul>%s</ul>
                </main></body></html>
                """.formatted(escape(documentTitle), escape(documentTitle), figureMarkup, legendMarkup);
    }

    @SuppressWarnings("unchecked")
    private static String documentTitle(Map<String, Object> document) {
        Object metadata = document.get("metadata");
        if (metadata instanceof Map<?, ?> metadataMap && metadataMap.get("title") != null) {
            return String.valueOf(metadataMap.get("title"));
        }
        return textOrEmpty(document.get("type"));
    }

    private static String svgPoints(List<Point> points, Bounds bounds) {
        StringBuilder result = new StringBuilder();
        for (Point point : points) {
            double x = (point.longitude() - bounds.minLongitude()) / bounds.longitudeSpan() * 1000;
            double y = (bounds.maxLatitude() - point.latitude()) / bounds.latitudeSpan() * 1000;
            result.append(String.format(java.util.Locale.ROOT, "%.3f,%.3f ", x, y));
        }
        return result.toString().trim();
    }

    private static String colorFor(String category) {
        int hue = Math.floorMod(category.hashCode(), 360);
        return "hsl(" + hue + ", 58%, 42%)";
    }

    private static String escape(String text) {
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private record Point(double longitude, double latitude) {
    }

    private record Feature(String id, String name, String category, List<Point> points,
                           Map<String, Object> properties) {
    }

    private record Bounds(double minLongitude, double maxLongitude, double minLatitude,
                          double maxLatitude) {
        private static Bounds from(List<Feature> features) {
            double minLongitude = Double.POSITIVE_INFINITY;
            double maxLongitude = Double.NEGATIVE_INFINITY;
            double minLatitude = Double.POSITIVE_INFINITY;
            double maxLatitude = Double.NEGATIVE_INFINITY;
            for (Feature feature : features) {
                for (Point point : feature.points()) {
                    minLongitude = Math.min(minLongitude, point.longitude());
                    maxLongitude = Math.max(maxLongitude, point.longitude());
                    minLatitude = Math.min(minLatitude, point.latitude());
                    maxLatitude = Math.max(maxLatitude, point.latitude());
                }
            }
            if (minLongitude == maxLongitude || minLatitude == maxLatitude) {
                throw new IllegalArgumentException("The polygon bounds must span longitude and latitude");
            }
            return new Bounds(minLongitude, maxLongitude, minLatitude, maxLatitude);
        }

        private double longitudeSpan() {
            return maxLongitude - minLongitude;
        }

        private double latitudeSpan() {
            return maxLatitude - minLatitude;
        }
    }
}
