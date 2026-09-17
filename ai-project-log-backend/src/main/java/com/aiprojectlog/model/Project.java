package com.aiprojectlog.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "projects")
@Getter
@Setter
@NoArgsConstructor
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Source source = Source.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectStatus status = ProjectStatus.ACTIVE;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    // --- cached AI-generated summary ---
    @Column(columnDefinition = "TEXT")
    private String summaryText;

    private Instant summaryGeneratedAt;

    @Column(nullable = false)
    private boolean summaryStale = false;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ts DESC")
    private List<Checkpoint> checkpoints = new ArrayList<>();

    public void touch() {
        this.updatedAt = Instant.now();
    }

    public void addCheckpoint(Checkpoint checkpoint) {
        checkpoint.setProject(this);
        this.checkpoints.add(0, checkpoint);
        this.touch();
        if (this.summaryText != null) {
            this.summaryStale = true;
        }
    }
}
