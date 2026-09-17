package com.aiprojectlog.service;

import com.aiprojectlog.dto.Dtos.*;
import com.aiprojectlog.exception.NotFoundException;
import com.aiprojectlog.model.Checkpoint;
import com.aiprojectlog.model.Project;
import com.aiprojectlog.model.ProjectStatus;
import com.aiprojectlog.model.Source;
import com.aiprojectlog.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMapper mapper;
    private final AnthropicSummaryService summaryService;

    public List<ProjectResponse> listProjects(ProjectStatus statusFilter, String query) {
        return projectRepository.findAll().stream()
                .filter(p -> statusFilter == null || p.getStatus() == statusFilter)
                .filter(p -> query == null || query.isBlank() || p.getName().toLowerCase().contains(query.toLowerCase()))
                .sorted((a, b) -> b.getUpdatedAt().compareTo(a.getUpdatedAt()))
                .map(mapper::toResponse)
                .toList();
    }

    public ProjectResponse getProject(UUID id) {
        return mapper.toResponse(findOrThrow(id));
    }

    // creating a project with a name that already exists (case-insensitive)
    // returns the existing one instead of creating a duplicate — same rule
    // the extension popup uses when you type an existing project's name
    public ProjectResponse createOrReuseProject(CreateProjectRequest req) {
        Project existing = projectRepository.findByNameIgnoreCase(req.name().trim()).orElse(null);
        if (existing != null) {
            return mapper.toResponse(existing);
        }
        Project project = new Project();
        project.setName(req.name().trim());
        project.setSource(req.source() != null ? req.source() : Source.OTHER);
        return mapper.toResponse(projectRepository.save(project));
    }

    public ProjectResponse updateProject(UUID id, UpdateProjectRequest req) {
        Project project = findOrThrow(id);
        if (req.name() != null && !req.name().isBlank()) {
            project.setName(req.name().trim());
        }
        if (req.status() != null) {
            project.setStatus(req.status());
        }
        project.touch();
        return mapper.toResponse(projectRepository.save(project));
    }

    public void deleteProject(UUID id) {
        Project project = findOrThrow(id);
        projectRepository.delete(project);
    }

    public CheckpointResponse addCheckpoint(UUID projectId, CreateCheckpointRequest req) {
        Project project = findOrThrow(projectId);
        Checkpoint checkpoint = new Checkpoint();
        checkpoint.setNote(req.note().trim());
        checkpoint.setLink(req.link() == null ? null : req.link().trim());
        project.addCheckpoint(checkpoint);
        projectRepository.save(project);
        return mapper.toResponse(checkpoint);
    }

    public ProjectResponse updateCheckpointLink(UUID projectId, UUID checkpointId, UpdateCheckpointLinkRequest req) {
        Project project = findOrThrow(projectId);
        Checkpoint checkpoint = project.getCheckpoints().stream()
                .filter(c -> c.getId().equals(checkpointId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Checkpoint not found: " + checkpointId));
        checkpoint.setLink(req.link() == null ? null : req.link().trim());
        return mapper.toResponse(projectRepository.save(project));
    }

    public ProjectResponse deleteCheckpoint(UUID projectId, UUID checkpointId) {
        Project project = findOrThrow(projectId);
        boolean removed = project.getCheckpoints().removeIf(c -> c.getId().equals(checkpointId));
        if (!removed) {
            throw new NotFoundException("Checkpoint not found: " + checkpointId);
        }
        project.touch();
        return mapper.toResponse(projectRepository.save(project));
    }

    public GenerateSummaryResponse generateSummary(UUID projectId) {
        Project project = findOrThrow(projectId);
        String text = summaryService.summarize(project);
        project.setSummaryText(text);
        project.setSummaryGeneratedAt(java.time.Instant.now());
        project.setSummaryStale(false);
        projectRepository.save(project);
        return new GenerateSummaryResponse(text);
    }

    private Project findOrThrow(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Project not found: " + id));
    }
}
