package com.example.ppe.user;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            User user = userService.login(loginRequest.getEmployeeId(), loginRequest.getPassword());
            // 비밀번호를 제외한 정보만 전달하기 위해 DTO 사용
            return ResponseEntity.ok(UserResponse.from(user));
        } catch (IllegalArgumentException e) {
            // 아이디가 없거나 비밀번호가 틀린 경우 401 응답
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
}

}
