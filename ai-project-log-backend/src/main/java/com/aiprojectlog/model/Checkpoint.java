package com.aiprojectlog.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "checkpoints")
@Getter
@Setter
@NoArgsConstructor
public class Checkpoint {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonIgnore
    private Project project;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String note;

    // each checkpoint keeps its own chat URL — a project can span many
    // different chat sessions/accounts over its lifetime
    private String link;

    @Column(nullable = false)
    private Instant ts = Instant.now();
}
