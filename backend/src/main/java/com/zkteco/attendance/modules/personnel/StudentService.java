package com.zkteco.attendance.modules.personnel;

import com.zkteco.attendance.common.AppException;
import com.zkteco.attendance.common.ErrorCode;
import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.common.ResourceNotFoundException;
import com.zkteco.attendance.modules.personnel.dto.CreateStudentRequest;
import com.zkteco.attendance.modules.personnel.dto.StudentDto;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;

    @Transactional(readOnly = true)
    public PageResponse<StudentDto> getStudents(String search, String className, String status, Pageable pageable) {
        Specification<Student> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("studentCode")), pattern),
                        cb.like(cb.lower(root.get("englishName")), pattern),
                        cb.like(cb.lower(root.get("khmerName")), pattern)
                ));
            }

            if (className != null && !className.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("className"), className.trim()));
            }

            if (status != null && !status.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status.trim().toUpperCase()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Student> page = studentRepository.findAll(spec, pageable);
        List<StudentDto> dtos = page.getContent().stream().map(this::toDto).collect(Collectors.toList());
        return PageResponse.of(page, dtos);
    }

    @Transactional(readOnly = true)
    public StudentDto getStudentById(Long id) {
        Student s = studentRepository.findById(id)
                .filter(st -> st.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
        return toDto(s);
    }

    @Transactional
    public StudentDto createStudent(CreateStudentRequest request) {
        if (studentRepository.existsByStudentCodeAndDeletedAtIsNull(request.getStudentCode())) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Student code already exists: " + request.getStudentCode());
        }

        Student s = Student.builder()
                .studentCode(request.getStudentCode().trim().toUpperCase())
                .khmerName(request.getKhmerName())
                .englishName(request.getEnglishName().trim())
                .gender(request.getGender().toUpperCase())
                .className(request.getClassName())
                .grade(request.getGrade())
                .academicYear(request.getAcademicYear())
                .parentContact(request.getParentContact())
                .status(request.getStatus() != null ? request.getStatus().toUpperCase() : "ACTIVE")
                .build();

        return toDto(studentRepository.save(s));
    }

    @Transactional
    public StudentDto updateStudent(Long id, CreateStudentRequest request) {
        Student s = studentRepository.findById(id)
                .filter(st -> st.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));

        s.setKhmerName(request.getKhmerName());
        s.setEnglishName(request.getEnglishName().trim());
        s.setGender(request.getGender().toUpperCase());
        s.setClassName(request.getClassName());
        s.setGrade(request.getGrade());
        s.setAcademicYear(request.getAcademicYear());
        s.setParentContact(request.getParentContact());
        if (request.getStatus() != null) s.setStatus(request.getStatus().toUpperCase());

        return toDto(studentRepository.save(s));
    }

    @Transactional
    public void deleteStudent(Long id) {
        Student s = studentRepository.findById(id)
                .filter(st -> st.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));

        s.setDeletedAt(Instant.now());
        s.setStatus("WITHDRAWN");
        studentRepository.save(s);
    }

    public StudentDto toDto(Student s) {
        if (s == null) return null;
        return StudentDto.builder()
                .id(s.getId())
                .studentCode(s.getStudentCode())
                .khmerName(s.getKhmerName())
                .englishName(s.getEnglishName())
                .gender(s.getGender())
                .className(s.getClassName())
                .grade(s.getGrade())
                .academicYear(s.getAcademicYear())
                .parentContact(s.getParentContact())
                .status(s.getStatus())
                .build();
    }
}

