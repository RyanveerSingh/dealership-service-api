package com.dms.service;

import com.dms.service.config.BillingProperties;
import com.dms.service.config.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.retry.annotation.EnableRetry;

import java.util.TimeZone;

@SpringBootApplication
@EnableRetry   // activates @Retryable on the optimistic-lock path
@EnableConfigurationProperties({JwtProperties.class, BillingProperties.class})
public class DealershipServiceApiApplication {

	static {
		// Pin the JVM to UTC before anything reads a clock or opens a connection.
		//
		// The JDBC driver converts LocalDateTime between the JVM zone and the
		// connection zone. With the JVM on IST and the connection on UTC, a 14:00
		// booking was written to the DATETIME column as 08:30 - it read back as
		// 14:00, so the API looked right while the stored row was misleading, and
		// the same request on a UTC server would have stored 14:00 instead. That
		// makes the meaning of a row depend on which machine wrote it.
		//
		// Setting this in a static block rather than via -Duser.timezone means it
		// holds however the app is launched: mvn spring-boot:run, java -jar, or a
		// container with no TZ set.
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
	}

	public static void main(String[] args) {
		SpringApplication.run(DealershipServiceApiApplication.class, args);
	}

}
