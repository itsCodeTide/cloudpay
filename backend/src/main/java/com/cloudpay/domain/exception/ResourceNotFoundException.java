package com.cloudpay.domain.exception;

public class ResourceNotFoundException extends DomainException {

    public ResourceNotFoundException(String resource, Object identifier) {
        super("%s not found: %s".formatted(resource, identifier));
    }
}
