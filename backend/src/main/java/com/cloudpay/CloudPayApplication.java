package com.cloudpay;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CloudPayApplication {
    public static void main(String[] args) {
        SpringApplication.run(CloudPayApplication.class, args);
    }
}
