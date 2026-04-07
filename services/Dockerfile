# Step 1: Build the application
FROM gradle:8.5-jdk17 AS build
COPY --chown=gradle:gradle . /home/gradle/src
WORKDIR /home/gradle/src
RUN gradle shadowJar --no-daemon

# Step 2: Run the application
FROM openjdk:17-slim
EXPOSE 8080
RUN mkdir /app
# This assumes your project is named "rest-api" in settings.gradle.kts
COPY --from=build /home/gradle/src/build/libs/*-all.jar /app/manga-api.jar
ENTRYPOINT ["java", "-jar", "/app/manga-api.jar"]