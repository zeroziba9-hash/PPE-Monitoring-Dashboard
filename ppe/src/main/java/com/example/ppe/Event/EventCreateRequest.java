package com.example.ppe.Event;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EventCreateRequest {
    private String cctvNo;
    private Integer detectedCode;
    private Double confidence;
    private String bboxJson;
}
