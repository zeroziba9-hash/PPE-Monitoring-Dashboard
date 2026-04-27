package com.example.ppe.Event;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/event")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    // GET /api/event/latest
    @GetMapping("/latest")
    public ResponseEntity<List<EventResponse>> getLatestEvents() {
        List<Event> events = eventService.getLatestEvents();
        List<EventResponse> responses = events.stream()
                .map(EventResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    // POST /api/event - 업로드 직후 알람 생성(간이)
    @PostMapping
    public ResponseEntity<EventResponse> createEvent(@RequestBody EventCreateRequest request) {
        Event created = eventService.createEvent(
                request.getCctvNo(),
                request.getDetectedCode(),
                request.getConfidence(),
                request.getBboxJson()
        );
        return ResponseEntity.ok(EventResponse.from(created));
    }

    // PATCH /api/event/{eventId}/status - 특정 이벤트의 상태(완료 여부) 업데이트
    @PatchMapping("/{eventId}/status")
    public ResponseEntity<EventResponse> updateEventStatus(@PathVariable Integer eventId, @RequestBody EventStatusRequest request) {
        Event updatedEvent = eventService.updateEventStatus(eventId, request.getStatus());
        return ResponseEntity.ok(EventResponse.from(updatedEvent));
    }
}