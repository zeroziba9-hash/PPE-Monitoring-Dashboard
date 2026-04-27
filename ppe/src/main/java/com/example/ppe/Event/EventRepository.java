package com.example.ppe.Event;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EventRepository extends JpaRepository<Event, Integer> {
    // 모든 데이터를 최신 등록순으로 가져오기
    List<Event> findAllByOrderByCreatedAtDesc();

    Optional<Event> findTopByCctvNoAndDetectedCodeOrderByDetectedAtDesc(String cctvNo, Integer detectedCode);
}