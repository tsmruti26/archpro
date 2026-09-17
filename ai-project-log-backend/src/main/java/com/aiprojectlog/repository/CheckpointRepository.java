package com.aiprojectlog.repository;

import com.aiprojectlog.model.Checkpoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CheckpointRepository extends JpaRepository<Checkpoint, UUID> {
}
