package com.aiprojectlog.dto;

import com.aiprojectlog.model.ProjectStatus;
import com.aiprojectlog.model.Source;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class Dtos {

    public record CreateProjectRequest(
            @NotBlank String name,
            Source source
    ) {}

    public record UpdateProjectRequest(
            String name,
            ProjectStatus status
    ) {}

    public record CreateCheckpointRequest(
            @NotBlank String note,
            String link
    ) {}

    public record UpdateCheckpointLinkRequest(
            String link
    ) {}

    public record CheckpointResponse(
            UUID id,
            String note,
            String link,
            Instant ts
    ) {}

    public record SummaryResponse(
            String text,
            Instant generatedAt,
            boolean stale
    ) {}

    public record ProjectResponse(
            UUID id,
            String name,
            Source source,
            ProjectStatus status,
            Instant createdAt,
            Instant updatedAt,
            SummaryResponse summary,
            List<CheckpointResponse> checkpoints
    ) {}

    public record GenerateSummaryResponse(
            String text
    ) {}
}
