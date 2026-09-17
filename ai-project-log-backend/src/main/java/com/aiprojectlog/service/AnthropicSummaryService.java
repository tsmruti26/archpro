package com.aiprojectlog.service;

import com.aiprojectlog.exception.SummaryGenerationException;
import com.aiprojectlog.model.Checkpoint;
import com.aiprojectlog.model.Project;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.Map;

@Service
public class AnthropicSummaryService {

    private static final Logger log = LoggerFactory.getLogger(AnthropicSummaryService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("MMM d, yyyy").withZone(ZoneOffset.UTC);

    private final WebClient webClient;
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AnthropicSummaryService(
            @Value("${anthropic.base-url}") String baseUrl,
            @Value("${anthropic.api-key}") String apiKey,
            @Value("${anthropic.model}") String model
    ) {
        this.webClient = WebClient.builder().baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        this.model = model;
    }

    public String summarize(Project project) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new SummaryGenerationException(
                    "No Anthropic API key configured on the server. Set the ANTHROPIC_API_KEY environment variable.");
        }

        String notes = project.getCheckpoints().stream()
                .sorted(Comparator.comparing(Checkpoint::getTs))
                .map(c -> "- " + DATE_FMT.format(c.getTs()) + ": " + c.getNote())
                .reduce((a, b) -> a + "\n" + b)
                .orElse("(no checkpoints logged yet)");

        String prompt = """
                Project name: %s
                Where it's built: %s

                Checkpoint log (oldest to newest):
                %s

                Based only on the log above, write:
                1. A one-sentence description of what this project is.
                2. A comma-separated list of the technologies/tools/languages mentioned or clearly implied (omit if genuinely none are evident).
                Respond in plain text, two short lines, no headers or markdown.
                """.formatted(project.getName(), project.getSource().getLabel(), notes);

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "max_tokens", 300,
                "messages", new Object[]{ Map.of("role", "user", "content", prompt) }
        );

        try {
            JsonNode response = webClient.post()
                    .uri("/v1/messages")
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", "2023-06-01")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response == null || !response.has("content")) {
                throw new SummaryGenerationException("Anthropic API returned an empty response.");
            }

            StringBuilder text = new StringBuilder();
            for (JsonNode block : response.get("content")) {
                if ("text".equals(block.path("type").asText())) {
                    text.append(block.path("text").asText());
                }
            }
            return text.toString().trim();

        } catch (WebClientResponseException e) {
            log.error("Anthropic API call failed: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new SummaryGenerationException("Anthropic API error: " + e.getStatusCode());
        }
    }
}
