package com.cloudpay.application.mapper;
import com.cloudpay.application.dto.user.UserResponse;
import com.cloudpay.domain.model.User;
import org.mapstruct.Mapper;
@Mapper(componentModel = "spring")
public interface UserDtoMapper { UserResponse toResponse(User user); }
