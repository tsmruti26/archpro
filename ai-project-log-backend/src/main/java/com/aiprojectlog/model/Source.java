package com.aiprojectlog.model;

public enum Source {
    CLAUDE("Claude"),
    GPT("ChatGPT"),
    GEMINI("Gemini"),
    OTHER("Other");

    private final String label;

    Source(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
