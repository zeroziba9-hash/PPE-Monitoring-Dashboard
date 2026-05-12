package com.example.ppe.user;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public List<User> findAllUsers() {
        return userRepository.findAll();
    }

    public User findUserById(String employeeId) {
        if (employeeId == null) {
            throw new IllegalArgumentException("사원 번호가 null입니다.");
        }
        return userRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("해당 사원 번호의 사용자가 존재하지 않습니다: " + employeeId));
    }

    public User login(String employeeId, String password) {
        User user = findUserById(employeeId);
        if (!user.getPassword().equals(password)) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }
        return user;
    }

    @Transactional
    public User createUser(User user) {
        if (user == null) {
            throw new IllegalArgumentException("사용자 정보가 null입니다.");
        }
        return userRepository.save(user);
    }

    @Transactional
    public void deleteUser(String employeeId) {
        if (employeeId == null) {
            throw new IllegalArgumentException("사원 번호가 null입니다.");
        }
        userRepository.deleteById(employeeId);
    }
}
