# 服务器服务与内存审计（2026-10-09）

服务器：`101.43.38.7`。时间均为 Asia/Shanghai。

## 结论

- 已卸载 OpenClaw 2026.5.7 和 kkFileView 5.0.2；程序、容器、镜像及自动启动项已移除。配置与历史数据保存在服务器受保护的备份目录。
- 两套 MySQL 分别属于 Soybean 和 TableFusion，不是同一数据库重复启动。建议保留宿主机 MySQL 8.4.8，将 TableFusion 的业务库通过逻辑导出/导入迁入；尚未迁移或删除任何 MySQL 数据。
- FitTrace 使用 PostgreSQL，与 MySQL 合并独立。

## 采样与口径

- 卸载前采样：2026-10-09T17:10:43.679403+08:00；物理内存 3723 MiB，可用 1178 MiB，Swap 已用 92 MiB。
- 卸载后采样：2026-10-09T17:22:04.026031+08:00；可用 1789 MiB，Swap 已用 181 MiB。采样期间有 SSH 与审计脚本开销。
- PSS 将共享页按比例分摊，适合比较服务实际内存；RSS 包含共享页，直接加总会重复计算。
- systemd/Docker 的 cgroup 内存还可能含文件缓存，不能直接与 PSS、RSS 相加。Swap 有历史换出页，不等于当前还在大量换页。卸载后短时 vmstat 的 si/so 均为 0。
- 下列所有表格使用同一次卸载后进程采样。`user@*.service` 包含子服务；与用户级表格存在父子关系。

## 当前 Docker 容器

| 容器              | 用途/连接                                      | PSS MiB | RSS MiB | Swap MiB | 内存上限 | 状态                      |
| ----------------- | ---------------------------------------------- | ------: | ------: | -------: | -------- | ------------------------- |
| soybean-web-1     | Soybean 前端，127.0.0.1:9000                   |     5.4 |    15.2 |      0.0 | 128 MiB  | running/healthy           |
| soybean-server-1  | Soybean 后端，8000/8001，连接宿主机 MySQL:3623 |   316.3 |   316.3 |      0.0 | 896 MiB  | running/healthy           |
| tablefusion       | TableFusion，18080，连接 mysql:3306            |    72.9 |    72.9 |      5.9 | 未设置   | running（未配置健康检查） |
| tablefusion-mysql | MySQL 8.0.46，仅 Docker 网络内，tablefusion 库 |   350.8 |   350.8 |     53.8 | 未设置   | running/healthy           |

## 当前系统级常驻服务（40 个）

| 服务                        | 用途                                                         | PSS MiB | RSS MiB | Swap MiB |
| --------------------------- | ------------------------------------------------------------ | ------: | ------: | -------: |
| mysql.service               | 宿主机 MySQL 8.4.8，Soybean/admin_system，3623               |   397.0 |   403.9 |     55.4 |
| fittrace-api.service        | FitTrace API，127.0.0.1:3100，内存上限 512 MiB               |    98.5 |   106.1 |      0.0 |
| docker.service              | Docker 管理进程及端口代理，不含容器业务内存                  |    90.7 |    98.5 |      6.3 |
| clash-verge-service.service | Clash Verge / mihomo 网络代理，127.0.0.1:7897                |    88.0 |    90.3 |      4.1 |
| containerd.service          | 容器运行时及 shim，不含容器业务内存                          |    61.2 |    73.7 |      2.0 |
| lightdm.service             | 图形登录管理器与 Xorg；登录界面另在 lightdm 用户会话         |    59.0 |   102.5 |     15.9 |
| cron.service                | 定时任务，含腾讯云 YDService/YDLive/sgagent 子进程           |    41.4 |    53.0 |      0.0 |
| fwupd.service               | 固件更新守护进程                                             |    29.1 |    42.4 |      0.0 |
| postgresql@16-main.service  | PostgreSQL 16，FitTrace 数据库，5432                         |    22.9 |    84.9 |      0.0 |
| multipathd.service          | 多路径存储管理                                               |    21.5 |    26.7 |      0.0 |
| user@114.service            | lightdm 用户服务管理器；数值包含桌面用户子服务，不能重复加总 |    20.4 |   131.4 |     10.3 |
| networkd-dispatcher.service | 网络状态事件处理                                             |    11.6 |    20.0 |      0.8 |
| systemd-journald.service    | Journal Service                                              |     9.8 |    16.3 |      0.8 |
| unattended-upgrades.service | 自动安全更新                                                 |     9.4 |    18.2 |      2.0 |
| nginx.service               | 宿主机反向代理，80/443/5000                                  |     7.5 |    15.9 |      0.0 |
| tat_agent.service           | 腾讯云自动化助手                                             |     6.4 |     6.4 |      0.0 |
| colord.service              | 颜色管理                                                     |     5.3 |    13.2 |      0.0 |
| cups-browsed.service        | 网络打印机发现                                               |     5.2 |    16.2 |      0.0 |
| NetworkManager.service      | Network Manager                                              |     5.0 |    16.1 |      1.5 |
| systemd-udevd.service       | Rule-based Manager for Device Events and Files               |     4.4 |     7.9 |      0.0 |
| user@1000.service           | ubuntu 用户服务管理器；数值包含用户子服务，不能重复加总      |     4.0 |    18.3 |      2.1 |
| cups.service                | 打印服务                                                     |     3.4 |    17.5 |      1.2 |
| redis-server.service        | Redis，127.0.0.1:6379                                        |     2.8 |     9.8 |      1.1 |
| ModemManager.service        | 调制解调器管理                                               |     2.7 |     9.5 |      0.2 |
| systemd-resolved.service    | Network Name Resolution                                      |     2.7 |    11.9 |      0.7 |
| udisks2.service             | Disk Manager                                                 |     2.6 |    10.9 |      1.3 |
| systemd-networkd.service    | Network Configuration                                        |     1.8 |     8.8 |      0.9 |
| systemd-logind.service      | User Login Management                                        |     1.8 |     8.7 |      0.6 |
| dbus.service                | D-Bus System Message Bus                                     |     1.7 |     6.2 |      0.3 |
| polkit.service              | Authorization Manager                                        |     1.6 |     8.7 |      1.9 |
| ssh.service                 | SSH 登录                                                     |     1.6 |     8.2 |      0.0 |
| accounts-daemon.service     | 系统账号管理                                                 |     1.5 |     8.3 |      0.0 |
| rsyslog.service             | 系统日志                                                     |     0.9 |     4.7 |      1.0 |
| chrony.service              | chrony, an NTP client/server                                 |     0.8 |     6.1 |      0.6 |
| upower.service              | 电源管理                                                     |     0.8 |     7.7 |      0.8 |
| avahi-daemon.service        | 局域网服务发现                                               |     0.7 |     5.5 |      0.2 |
| wpa_supplicant.service      | 无线网络认证                                                 |     0.3 |     4.3 |      0.8 |
| getty@tty1.service          | Getty on tty1                                                |     0.2 |     2.1 |      0.0 |
| serial-getty@ttyS0.service  | Serial Getty on ttyS0                                        |     0.2 |     2.3 |      0.0 |
| rtkit-daemon.service        | 桌面实时调度                                                 |     0.1 |     3.3 |      0.2 |

## 用户级常驻服务

ubuntu 用户当前只有 `dbus.service`；OpenClaw 已移除。lightdm 用户运行以下 12 个服务：

| 服务                          | PSS MiB | RSS MiB | Swap MiB |
| ----------------------------- | ------: | ------: | -------: |
| dbus.service                  |     0.7 |     5.2 |      0.3 |
| at-spi-dbus-bus.service       |     1.0 |    18.8 |      1.7 |
| dconf.service                 |     0.5 |     5.8 |      0.2 |
| gnome-keyring-daemon.service  |     1.0 |     7.9 |      0.6 |
| gvfs-daemon.service           |     0.8 |     7.4 |      0.5 |
| indicator-application.service |     1.4 |    10.9 |      1.2 |
| indicator-datetime.service    |     3.1 |    12.6 |      0.5 |
| indicator-keyboard.service    |     3.3 |    16.0 |      1.3 |
| indicator-power.service       |     0.3 |     6.4 |      0.7 |
| indicator-session.service     |     1.5 |     8.0 |      0.3 |
| indicator-sound.service       |     1.2 |     9.3 |      0.9 |
| pulseaudio.service            |     1.1 |     8.5 |      1.4 |

图形登录环境还包含 Unity Greeter、Unity Settings、nm-applet 和 Xorg，分布在 lightdm 服务与用户会话内。上述桌面相关进程合计 PSS 约 168 MiB，已包含表中部分条目，不重复相加。

## 已完成的一次性系统服务

以下服务为 `active/exited`，一般没有常驻主进程，不能因 active 状态就视为高内存服务：

`apparmor.service`, `apport.service`, `blk-availability.service`, `clash-public-ip-route.service`, `cloud-config.service`, `cloud-final.service`, `cloud-init-local.service`, `cloud-init.service`, `console-setup.service`, `finalrd.service`, `kdump-tools.service`, `keyboard-setup.service`, `kmod-static-nodes.service`, `lm-sensors.service`, `lvm2-monitor.service`, `NetworkManager-wait-online.service`, `plymouth-quit-wait.service`, `plymouth-read-write.service`, `plymouth-start.service`, `postgresql.service`, `rc-local.service`, `setvtrgb.service`, `snapd.apparmor.service`, `snapd.seeded.service`, `sysstat.service`, `systemd-binfmt.service`, `systemd-journal-flush.service`, `systemd-modules-load.service`, `systemd-networkd-wait-online.service`, `systemd-random-seed.service`, `systemd-remount-fs.service`, `systemd-sysctl.service`, `systemd-tmpfiles-setup-dev-early.service`, `systemd-tmpfiles-setup-dev.service`, `systemd-tmpfiles-setup.service`, `systemd-udev-trigger.service`, `systemd-update-utmp.service`, `systemd-user-sessions.service`, `ufw.service`, `user-runtime-dir@1000.service`, `user-runtime-dir@114.service`。

## 异常与检查范围

- `fwupd-refresh.service` 在 17:01 刷新固件元数据时退出码为 1；这是固件元数据更新任务，尚未查清具体下载失败原因，不能据此认定业务服务或之前事故原因。
- 当前四个 Docker 容器均运行；三个带健康检查的容器为 healthy。
- 卸载后 Soybean、FitTrace HTTPS 页面和 TableFusion HTTP 页面均返回 200。该检查不等于三个产品的完整业务验收。
- 未停用桌面、Clash、数据库、Nginx 或其他项目。

## 两套 MySQL 的来源与合并方案

| 实例                 | 版本   | 连接地址             | 使用方/业务库             | 当前业务规模                                 |
| -------------------- | ------ | -------------------- | ------------------------- | -------------------------------------------- |
| 宿主机 mysql.service | 8.4.8  | 127.0.0.1:3623       | Soybean / admin_system    | 22 张表，约 1.61 MiB；当前账号仅能查看授权库 |
| tablefusion-mysql    | 8.0.46 | Docker 内 mysql:3306 | TableFusion / tablefusion | 5 张表，约 0.19 MiB                          |

TableFusion 的 `/usr/local/tablefusion/supply-tablefusion-py-main/docker-compose.yml` 声明了独立 mysql 服务、mysql_data 卷，并用 depends_on 等待该实例健康；应用环境变量也指向 mysql:3306。Soybean 则使用宿主机 3623 端口，因此两套实例都有真实应用连接。

TableFusion 的 5 张表均为 InnoDB，字符集/排序规则为 utf8mb4 / utf8mb4_0900_ai_ci，与宿主机一致；没有数据库触发器、存储过程或事件。只读核对行数为 events 36、output_product 24、product_mapping 56、weidian_part 24、weidian_part_alias 2。

MySQL 官方支持从 8.0 向 8.4 LTS 进行逻辑导出/导入升级，见 [官方升级路径](https://dev.mysql.com/doc/refman/8.4/en/upgrade-paths.html)。表结构和现有元数据检查显示合并可行，实际兼容性仍需导入与应用读写验收。

建议操作顺序：

1. 获取宿主机 MySQL 管理员权限；当前 soybean@localhost 只有 admin_system.* 权限，不能创建 tablefusion 库或新账号。不要重置现有管理员密码或扩大 Soybean 账号权限。
2. 备份 TableFusion 业务库、原 Compose 和配置；保留原 MySQL 卷用于回滚。
3. 在宿主机创建独立 tablefusion 数据库及仅限该库的专用账号，将业务库逻辑导入并逐表核对行数。不要导入旧实例的 mysql 系统库。
4. 修改 TableFusion Compose 的主机、端口和账号配置，使用 host.docker.internal 配合 host-gateway 连接宿主机 3623；移除对旧 mysql 服务的 depends_on。
5. 验证查询、映射保存、输出、事件记录等实际读写，再停止旧 MySQL 容器并去掉其自动启动配置。
6. 原数据卷保持为停用状态，完成验收后再决定是否删除。

停止独立 MySQL 后预计可减少约 350–400 MiB 常驻内存；新增数据库仍会让宿主机 MySQL 增加少量占用，不能保证精确释放量。两个应用仍应使用独立数据库和账号。

## 本次卸载与备份

- 备份目录：`/var/backups/service-removal/20261009-172057`，仅 root 可访问。
- OpenClaw：停用并移除用户级 gateway 服务，卸载全局 npm 包；历史状态保存在 `openclaw-state`。Node/NVM 和其他 Node 程序继续保留。
- kkFileView：移除容器、专用 Docker 网络、应用与基础镜像和 `/opt/kkfileview` 安装目录；备份 config、data、Compose、容器元数据及旧路由 unit。8012 不再监听。
- 原 kkFileView 路由 unit 同时维护公共 IP 的本地路由。本次仅删除 8012 专用规则，将现有公共 IP 路由保留为 `clash-public-ip-route.service`，该一次性服务没有常驻主进程。
- 两套 MySQL 都继续运行，未进行迁移、合并或数据删除。
