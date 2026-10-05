package com.cloudpay.infrastructure.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter @Setter
@Configuration
@EnableConfigurationProperties
@ConfigurationProperties(prefix = "cloudpay")
public class CloudPayProperties {
    private Jwt jwt = new Jwt();
    private Cors cors = new Cors();
    private String upiHandle = "@cloudpay";
    private Supabase supabase = new Supabase();
    private Redis redis = new Redis();
    private Events events = new Events();
    private Messaging messaging = new Messaging();
    private Backup backup = new Backup();
    private DisasterRecovery disasterRecovery = new DisasterRecovery();

    @Getter @Setter
    public static class Jwt {
        private String secret = "change-me-to-a-256-bit-secret-key-in-production";
        private long expirationMs = 86400000;
        private long refreshExpirationMs = 604800000;
    }

    @Getter @Setter
    public static class Cors {
        private String allowedOrigins = "http://localhost:3000";
    }

    @Getter @Setter
    public static class Supabase {
        private String url = "https://qqqrziqluolfidyelgvr.supabase.co";
        private String publishableKey;
        private String secretKey;
        private String jwksUrl = "https://qqqrziqluolfidyelgvr.supabase.co/auth/v1/.well-known/jwks.json";
    }

    @Getter @Setter
    public static class Redis {
        private boolean enabled = false;
    }

    @Getter @Setter
    public static class Events {
        private boolean enabled = false;
        private String paymentTopic = "cloudpay.payment.events";
    }

    @Getter @Setter
    public static class Messaging {
        private Sqs sqs = new Sqs();
    }

    @Getter @Setter
    public static class Sqs {
        private String queueUrl;
        private boolean enabled = false;
    }

    @Getter @Setter
    public static class Backup {
        private String s3Bucket;
        private String region;
    }

    @Getter @Setter
    public static class DisasterRecovery {
        private String region;
    }
}
