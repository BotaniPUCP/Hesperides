package pe.edu.pucp.hesperides.shared.storage;

import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;

/**
 * Reduce una foto a dos tamaños JPEG (SPEC-103 D-07): una foto de celular de
 * 4 MB queda en unos 300 KB, y el mapa y el inventario cargan la miniatura.
 * Una foto más pequeña que el tamaño objetivo no se agranda.
 */
public final class PhotoProcessor {

    static final int FULL_SIDE = 1600;
    static final int THUMBNAIL_SIDE = 400;
    private static final float JPEG_QUALITY = 0.82f;

    private PhotoProcessor() {
    }

    public static ProcessedPhoto process(byte[] original) {
        BufferedImage image = decode(original);
        return new ProcessedPhoto(jpeg(scaled(image, FULL_SIDE)), jpeg(scaled(image, THUMBNAIL_SIDE)), "image/jpeg");
    }

    private static BufferedImage decode(byte[] bytes) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
            if (image == null) {
                throw new ValidationException("The file is not a supported image");
            }
            return image;
        } catch (IOException e) {
            throw new ValidationException("The file is not a readable image");
        }
    }

    /** Lado mayor igual a {@code side}, salvo que la foto ya sea más pequeña. */
    private static BufferedImage scaled(BufferedImage source, int side) {
        double factor = Math.min(1.0, (double) side / Math.max(source.getWidth(), source.getHeight()));
        int w = Math.max(1, (int) Math.round(source.getWidth() * factor));
        int h = Math.max(1, (int) Math.round(source.getHeight() * factor));
        // Lienzo RGB: un PNG con transparencia no puede guardarse como JPEG.
        BufferedImage target = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = target.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.drawImage(source, 0, 0, w, h, java.awt.Color.WHITE, null);
        g.dispose();
        return target;
    }

    private static byte[] jpeg(BufferedImage image) {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ImageWriteParam param = writer.getDefaultWriteParam();
        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        param.setCompressionQuality(JPEG_QUALITY);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ImageOutputStream stream = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(stream);
            writer.write(null, new IIOImage(image, null, null), param);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo codificar la foto", e);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }
}
