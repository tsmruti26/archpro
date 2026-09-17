package com.aiprojectlog.repository;

import com.aiprojectlog.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    Optional<Project> findByNameIgnoreCase(String name);
}
