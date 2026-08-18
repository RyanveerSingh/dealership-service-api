package com.dms.service.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Serves the built React bundle and makes client-side routing work.
 *
 * React Router owns paths like /bookings entirely in the browser. Spring knows
 * nothing about them, so a deep link or a page refresh on /bookings would
 * normally 404: Spring looks for a file at that path and finds none. Falling
 * back to index.html lets the router take over once the page loads.
 *
 * The fallback deliberately does not swallow /api or /actuator - a mistyped API
 * path must still return a JSON 404, not a page of HTML that a fetch() would
 * then fail to parse with a confusing error.
 */
@Configuration
public class SpaConfig implements WebMvcConfigurer {

    private static final String[] BACKEND_PREFIXES = {
            "api/", "actuator/", "v3/api-docs", "swagger-ui"
    };

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(@NonNull String resourcePath,
                                                   @NonNull Resource location) throws IOException {
                        Resource requested = location.createRelative(resourcePath);

                        // A real file: hashed JS/CSS bundles, favicon, and so on.
                        if (requested.exists() && requested.isReadable()) {
                            return requested;
                        }

                        for (String prefix : BACKEND_PREFIXES) {
                            if (resourcePath.startsWith(prefix)) {
                                return null;
                            }
                        }

                        // Anything else is a client-side route.
                        Resource index = new ClassPathResource("static/index.html");
                        return index.exists() ? index : null;
                    }
                });
    }
}
