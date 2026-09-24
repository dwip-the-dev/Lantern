#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <signal.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <fcntl.h>
#include <time.h>
#include <errno.h>
#include <dirent.h>

#define BUFFER_SIZE 4096

static volatile int keep_running = 1;
static int server_fd = -1;

void handle_signal(int sig) {
    keep_running = 0;
    if (server_fd >= 0) {
        close(server_fd);
        server_fd = -1;
    }
}

void get_base_dir(char *buf, size_t size) {
    const char *env_dir = getenv("LANTERN_DATA_DIR");
    if (env_dir && strlen(env_dir) > 0) {
        snprintf(buf, size, "%s", env_dir);
        return;
    }
    const char *home = getenv("HOME");
    if (home) {
        snprintf(buf, size, "%s/.lantern", home);
        return;
    }
    snprintf(buf, size, "/tmp/.lantern");
}

void get_pid_path(const char *service, char *buf, size_t size) {
    char base[512];
    get_base_dir(base, sizeof(base));
    snprintf(buf, size, "%s/pids/%s.pid", base, service);
}

void get_log_path(const char *service, char *buf, size_t size) {
    char base[512];
    get_base_dir(base, sizeof(base));
    snprintf(buf, size, "%s/logs/%s.log", base, service);
}

void log_timestamp(FILE *stream, const char *service, const char *msg) {
    time_t now = time(NULL);
    struct tm tm_buf;
    localtime_r(&now, &tm_buf);
    char time_str[64];
    strftime(time_str, sizeof(time_str), "%Y-%m-%d %H:%M:%S", &tm_buf);
    fprintf(stream, "[%s] [%s] %s\n", time_str, service, msg);
    fflush(stream);
}

int serve_service(const char *service, int port) {
    struct sockaddr_in address;
    int opt = 1;
    socklen_t addrlen = sizeof(address);

    signal(SIGTERM, handle_signal);
    signal(SIGINT, handle_signal);

    server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("socket failed");
        return 1;
    }

    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        perror("setsockopt SO_REUSEADDR failed");
        close(server_fd);
        return 1;
    }

    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(port);

    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0) {
        fprintf(stderr, "Failed to bind port %d: %s\n", port, strerror(errno));
        close(server_fd);
        return 1;
    }

    if (listen(server_fd, 64) < 0) {
        perror("listen failed");
        close(server_fd);
        return 1;
    }

    log_timestamp(stdout, service, "Native service daemon successfully initialized and listening.");
    printf("[%s] Bound 0.0.0.0:%d (PID %d)\n", service, port, getpid());
    fflush(stdout);

    char buffer[BUFFER_SIZE];

    while (keep_running) {
        int client_fd = accept(server_fd, (struct sockaddr *)&address, &addrlen);
        if (client_fd < 0) {
            if (!keep_running) break;
            continue;
        }

        ssize_t bytes_read = read(client_fd, buffer, sizeof(buffer) - 1);
        if (bytes_read > 0) {
            buffer[bytes_read] = '\0';
            
            char client_ip[INET_ADDRSTRLEN];
            inet_ntop(AF_INET, &address.sin_addr, client_ip, sizeof(client_ip));
            
            char log_msg[256];
            snprintf(log_msg, sizeof(log_msg), "Accepted HTTP request from %s:%d", client_ip, ntohs(address.sin_port));
            log_timestamp(stdout, service, log_msg);

            // Construct rich HTTP response
            char body[2048];
            snprintf(body, sizeof(body),
                "<!DOCTYPE html>\n"
                "<html lang=\"en\">\n"
                "<head>\n"
                "  <meta charset=\"UTF-8\" />\n"
                "  <title>%s · Lantern Service</title>\n"
                "  <style>\n"
                "    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }\n"
                "    .card { background: #121929; border: 1px solid #1e293b; border-radius: 24px; padding: 40px; max-width: 480px; width: 90%%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }\n"
                "    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 600; font-size: 13px; margin-bottom: 20px; }\n"
                "    .dot { width: 8px; height: 8px; border-radius: 50%%; background: #10b981; animation: pulse 2s infinite; }\n"
                "    h1 { font-size: 28px; margin: 0 0 8px 0; text-transform: capitalize; }\n"
                "    p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0; }\n"
                "    .stats { display: flex; justify-content: space-around; background: #0b0f19; border-radius: 16px; padding: 16px; border: 1px solid #1e293b; text-align: left; font-size: 12px; }\n"
                "    .stat-label { color: #64748b; margin-bottom: 4px; }\n"
                "    .stat-val { color: #f1f5f9; font-weight: 700; font-size: 14px; }\n"
                "  </style>\n"
                "</head>\n"
                "<body>\n"
                "  <div class=\"card\">\n"
                "    <div class=\"badge\"><span class=\"dot\"></span> Live Host Service</div>\n"
                "    <h1>%s</h1>\n"
                "    <p>Powered by <strong>Lantern Native Daemon</strong>. Running directly on host OS.</p>\n"
                "    <div class=\"stats\">\n"
                "      <div><div class=\"stat-label\">PID</div><div class=\"stat-val\">%d</div></div>\n"
                "      <div><div class=\"stat-label\">Port</div><div class=\"stat-val\">%d</div></div>\n"
                "      <div><div class=\"stat-label\">Protocol</div><div class=\"stat-val\">TCP/HTTP</div></div>\n"
                "    </div>\n"
                "  </div>\n"
                "</body>\n"
                "</html>\n",
                service, service, getpid(), port
            );

            char response[BUFFER_SIZE];
            int res_len = snprintf(response, sizeof(response),
                "HTTP/1.1 200 OK\r\n"
                "Content-Type: text/html; charset=utf-8\r\n"
                "Content-Length: %zu\r\n"
                "X-Lantern-Service: %s\r\n"
                "X-Lantern-PID: %d\r\n"
                "X-Lantern-Port: %d\r\n"
                "Connection: close\r\n\r\n"
                "%s",
                strlen(body), service, getpid(), port, body
            );

            write(client_fd, response, res_len);
        }
        close(client_fd);
    }

    log_timestamp(stdout, service, "Service daemon stopping gracefully.");
    if (server_fd >= 0) {
        close(server_fd);
        server_fd = -1;
    }
    return 0;
}

int cmd_start(const char *service, int port) {
    char pid_path[512];
    get_pid_path(service, pid_path, sizeof(pid_path));

    // Check if already running
    FILE *fp = fopen(pid_path, "r");
    if (fp) {
        pid_t existing_pid = 0;
        if (fscanf(fp, "%d", &existing_pid) == 1) {
            fclose(fp);
            if (kill(existing_pid, 0) == 0) {
                printf("Service '%s' is already running with PID %d\n", service, existing_pid);
                return 0;
            }
        } else {
            fclose(fp);
        }
    }

    char log_path[512];
    get_log_path(service, log_path, sizeof(log_path));

    pid_t pid = fork();
    if (pid < 0) {
        perror("fork failed");
        return 1;
    }

    if (pid > 0) {
        // Parent process: record PID and exit
        FILE *pf = fopen(pid_path, "w");
        if (pf) {
            fprintf(pf, "%d\n", pid);
            fclose(pf);
        }
        printf("Started '%s' on port %d with PID %d\n", service, port, pid);
        return 0;
    }

    // Child process: become session leader, redirect stdio to log file
    setsid();
    int log_fd = open(log_path, O_WRONLY | O_CREAT | O_APPEND, 0644);
    if (log_fd >= 0) {
        dup2(log_fd, STDOUT_FILENO);
        dup2(log_fd, STDERR_FILENO);
        close(log_fd);
    }
    int devnull = open("/dev/null", O_RDONLY);
    if (devnull >= 0) {
        dup2(devnull, STDIN_FILENO);
        close(devnull);
    }

    return serve_service(service, port);
}

int cmd_stop(const char *service) {
    char pid_path[512];
    get_pid_path(service, pid_path, sizeof(pid_path));

    FILE *fp = fopen(pid_path, "r");
    if (!fp) {
        printf("Service '%s' is not running (no PID file)\n", service);
        return 0;
    }

    pid_t pid = 0;
    if (fscanf(fp, "%d", &pid) != 1) {
        fclose(fp);
        unlink(pid_path);
        printf("Invalid PID file for '%s'\n", service);
        return 1;
    }
    fclose(fp);

    if (kill(pid, 0) != 0) {
        printf("Process %d for '%s' is not active. Cleaning up PID file.\n", pid, service);
        unlink(pid_path);
        return 0;
    }

    // Send SIGTERM
    kill(pid, SIGTERM);
    printf("Sent SIGTERM to '%s' (PID %d)...\n", service, pid);

    // Wait up to 3 seconds
    for (int i = 0; i < 30; i++) {
        usleep(100000); // 100ms
        if (kill(pid, 0) != 0) {
            unlink(pid_path);
            printf("Service '%s' stopped successfully.\n", service);
            return 0;
        }
    }

    // Force kill if still lingering
    kill(pid, SIGKILL);
    unlink(pid_path);
    printf("Service '%s' forcefully terminated with SIGKILL.\n", service);
    return 0;
}

int cmd_status(const char *service) {
    char pid_path[512];
    get_pid_path(service, pid_path, sizeof(pid_path));

    FILE *fp = fopen(pid_path, "r");
    if (!fp) {
        printf("{\"service\":\"%s\",\"status\":\"stopped\",\"pid\":null}\n", service);
        return 1;
    }

    pid_t pid = 0;
    if (fscanf(fp, "%d", &pid) != 1) {
        fclose(fp);
        printf("{\"service\":\"%s\",\"status\":\"error\",\"pid\":null}\n", service);
        return 1;
    }
    fclose(fp);

    if (kill(pid, 0) == 0) {
        printf("{\"service\":\"%s\",\"status\":\"running\",\"pid\":%d}\n", service, pid);
        return 0;
    } else {
        printf("{\"service\":\"%s\",\"status\":\"dead\",\"pid\":%d}\n", service, pid);
        return 1;
    }
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Lantern Native Process Runner & Supervisor\n");
        printf("Usage:\n");
        printf("  lantern-runner start <service> <port>\n");
        printf("  lantern-runner stop <service>\n");
        printf("  lantern-runner restart <service> <port>\n");
        printf("  lantern-runner status <service>\n");
        printf("  lantern-runner serve <service> <port>\n");
        return 1;
    }

    const char *action = argv[1];

    if (strcmp(action, "start") == 0) {
        if (argc < 4) {
            fprintf(stderr, "Error: service and port required for start\n");
            return 1;
        }
        int port = atoi(argv[3]);
        return cmd_start(argv[2], port);
    } else if (strcmp(action, "stop") == 0) {
        if (argc < 3) {
            fprintf(stderr, "Error: service name required for stop\n");
            return 1;
        }
        return cmd_stop(argv[2]);
    } else if (strcmp(action, "restart") == 0) {
        if (argc < 4) {
            fprintf(stderr, "Error: service and port required for restart\n");
            return 1;
        }
        cmd_stop(argv[2]);
        usleep(300000);
        int port = atoi(argv[3]);
        return cmd_start(argv[2], port);
    } else if (strcmp(action, "status") == 0) {
        if (argc < 3) {
            fprintf(stderr, "Error: service name required for status\n");
            return 1;
        }
        return cmd_status(argv[2]);
    } else if (strcmp(action, "serve") == 0) {
        if (argc < 4) {
            fprintf(stderr, "Error: service and port required for serve\n");
            return 1;
        }
        int port = atoi(argv[3]);
        return serve_service(argv[2], port);
    } else {
        fprintf(stderr, "Unknown command: %s\n", action);
        return 1;
    }
}
