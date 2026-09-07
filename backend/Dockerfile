# Build stage
FROM maven:3.9-eclipse-temurin-26 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests

# Runtime stage
FROM eclipse-temurin:26-jre-alpine
# addgroup/adduser de BusyBox: la imagen base es Alpine y no trae groupadd/useradd.
RUN addgroup --system hesperides && adduser --system --ingroup hesperides --no-create-home hesperides
WORKDIR /app
COPY --from=build /app/target/*.jar /app/app.jar
USER hesperides
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
