package com.aiprojectlog.controller;

import com.aiprojectlog.dto.Dtos.*;
import com.aiprojectlog.model.ProjectStatus;
import com.aiprojectlog.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    public List<ProjectResponse> list(
            @RequestParam(required = false) ProjectStatus status,
            @RequestParam(required = false) String q
    ) {
        return projectService.listProjects(status, q);
    }

    @GetMapping("/{id}")
    public ProjectResponse get(@PathVariable UUID id) {
        return projectService.getProject(id);
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> create(@Valid @RequestBody CreateProjectRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.createOrReuseProject(req));
    }

    @PatchMapping("/{id}")
    public ProjectResponse update(@PathVariable UUID id, @RequestBody UpdateProjectRequest req) {
        return projectService.updateProject(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/checkpoints")
    public ResponseEntity<CheckpointResponse> addCheckpoint(
            @PathVariable UUID id, @Valid @RequestBody CreateCheckpointRequest req
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.addCheckpoint(id, req));
    }

    @PatchMapping("/{id}/checkpoints/{checkpointId}/link")
    public ProjectResponse updateCheckpointLink(
            @PathVariable UUID id, @PathVariable UUID checkpointId, @RequestBody UpdateCheckpointLinkRequest req
    ) {
        return projectService.updateCheckpointLink(id, checkpointId, req);
    }

    @DeleteMapping("/{id}/checkpoints/{checkpointId}")
    public ProjectResponse deleteCheckpoint(@PathVariable UUID id, @PathVariable UUID checkpointId) {
        return projectService.deleteCheckpoint(id, checkpointId);
    }

    @PostMapping("/{id}/summary")
    public GenerateSummaryResponse generateSummary(@PathVariable UUID id) {
        return projectService.generateSummary(id);
    }
}
