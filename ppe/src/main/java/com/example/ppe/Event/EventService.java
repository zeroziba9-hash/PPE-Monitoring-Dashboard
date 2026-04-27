package com.example.ppe.Event;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService {

    private static final long EVENT_COOLDOWN_SECONDS = 300;

    private final EventRepository eventRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public List<Event> getLatestEvents() {
        return eventRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Event createEvent(String cctvNo, Integer detectedCode, Double confidence, String bboxJson) {
        String normalizedCctvNo = cctvNo == null ? "UNKNOWN" : cctvNo;
        Integer normalizedDetectedCode = detectedCode == null ? 0 : detectedCode;
        LocalDateTime now = LocalDateTime.now();

        Event latest = eventRepository
                .findTopByCctvNoAndDetectedCodeOrderByDetectedAtDesc(normalizedCctvNo, normalizedDetectedCode)
                .orElse(null);

        if (latest != null && latest.getDetectedAt() != null) {
            LocalDateTime cooldownUntil = latest.getDetectedAt().plusSeconds(EVENT_COOLDOWN_SECONDS);
            if (now.isBefore(cooldownUntil)) {
                EventResponse liveResponse = EventResponse.builder()
                        .id(latest.getId())
                        .cctvNo(normalizedCctvNo)
                        .detectedCode(normalizedDetectedCode)
                        .detectedAt(now)
                        .confidence(confidence)
                        .bboxJson(bboxJson)
                        .completedFlag(latest.isCompletedFlag())
                        .completedAt(latest.getCompletedAt())
                        .createdAt(latest.getCreatedAt())
                        .build();
                messagingTemplate.convertAndSend("/topic/events", liveResponse);
                return latest;
            }
        }

        Event event = Event.builder()
                .cctvNo(normalizedCctvNo)
                .detectedCode(normalizedDetectedCode)
                .detectedAt(now)
                .confidence(confidence)
                .bboxJson(bboxJson)
                .completedFlag(false)
                .completedAt(null)
                .build();

        Event saved = eventRepository.save(event);
        messagingTemplate.convertAndSend("/topic/events", EventResponse.from(saved));
        return saved;
    }

    @Transactional
    public Event updateEventStatus(Integer eventId, String status) {
        if (eventId == null) {
            throw new IllegalArgumentException("이벤트 ID가 null입니다.");
        }
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("해당 이벤트를 찾을 수 없습니다. ID: " + eventId));
        
        if ("RESOLVED".equalsIgnoreCase(status)) {
            event.setCompletedFlag(true);
            event.setCompletedAt(LocalDateTime.now());
        } else {
            event.setCompletedFlag(false);
            event.setCompletedAt(null);
        }

        Event saved = eventRepository.save(event);
        messagingTemplate.convertAndSend("/topic/events", EventResponse.from(saved));
        return saved;
    }
}