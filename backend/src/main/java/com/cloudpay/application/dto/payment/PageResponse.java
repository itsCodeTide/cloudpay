package com.cloudpay.application.dto.payment;
import java.util.List;
public record PageResponse<T>(List<T> content,int page,int size,long totalElements,int totalPages) {}
