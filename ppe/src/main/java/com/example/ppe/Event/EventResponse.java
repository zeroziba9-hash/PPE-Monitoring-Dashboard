package com.example.ppe.Event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
@Builder
public class EventResponse {
    private Integer id;
    private String cctvNo;
    private Integer detectedCode;
    private LocalDateTime detectedAt;
    private Double confidence;
    private String bboxJson;
    private boolean completedFlag;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;

    public static EventResponse from(Event event) {
        return EventResponse.builder()
                .id(event.getId())
                .cctvNo(event.getCctvNo())
                .detectedCode(event.getDetectedCode())
                .detectedAt(event.getDetectedAt())
                .confidence(event.getConfidence())
                .bboxJson(event.getBboxJson())
                .completedFlag(event.isCompletedFlag())
                .completedAt(event.getCompletedAt())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
