package com.aiprojectlog.service;

import com.aiprojectlog.dto.Dtos.*;
import com.aiprojectlog.model.Checkpoint;
import com.aiprojectlog.model.Project;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ProjectMapper {

    public ProjectResponse toResponse(Project p) {
        SummaryResponse summary = p.getSummaryText() == null
                ? null
                : new SummaryResponse(p.getSummaryText(), p.getSummaryGeneratedAt(), p.isSummaryStale());

        List<CheckpointResponse> checkpoints = p.getCheckpoints().stream()
                .map(this::toResponse)
                .toList();

        return new ProjectResponse(
                p.getId(), p.getName(), p.getSource(), p.getStatus(),
                p.getCreatedAt(), p.getUpdatedAt(), summary, checkpoints
        );
    }

    public CheckpointResponse toResponse(Checkpoint c) {
        return new CheckpointResponse(c.getId(), c.getNote(), c.getLink(), c.getTs());
    }
}
