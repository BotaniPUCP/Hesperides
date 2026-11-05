# Build stage
FROM docker.io/library/maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests

# Runtime stage
FROM docker.io/library/eclipse-temurin:25-jre-alpine
# addgroup/adduser de BusyBox: la imagen base es Alpine y no trae groupadd/useradd.
RUN addgroup --system hesperides && adduser --system --ingroup hesperides --no-create-home hesperides
# Directorio de fotos (STORAGE_LOCAL_DIR). Un volumen nuevo hereda este dueño:
# sin esto quedaría de root y el usuario sin privilegios no podría escribir.
RUN mkdir -p /data/storage && chown hesperides:hesperides /data/storage
WORKDIR /app
COPY --from=build /app/target/*.jar /app/app.jar
USER hesperides
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
