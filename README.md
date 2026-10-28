# 五六零人工智能AI小镇 · V0.0.5

**新 AI 接手可复制 [导入提示词](新AI导入提示词.md)，先读 [开发交接标准](AI_HANDOFF.md) 和 [当前功能状态](docs/开发功能状态.md)，按需查阅 [docs文档导航](docs/README.md)。** 当前源码基于V0.0.5，保留原有微缩3D小镇风格；2026-10-28已撤销写实化实验，并准备按MIT开源。源码与历史部署包状态分别记录。

五六零人工智能科技（北海）有限公司的3D互动AI社区。包含七区沙盘、服务中心3D大厅、手机号＋密码注册与本地验证码测试、居民工作台、运营/超管、身份申请、多房间角色同步、公开气泡与同意制私聊。

**本地最新：V0.0.5；服务器最后确认：V0.0.1。** 2026-09-23用户提供六步部署完成日志，并确认前端注册及当前测试成功；服务器采用HTTPS手机号＋密码模式，真实短信未接入。本轮没有AI远程复测；详细验收与待办见功能状态。游客进入任何子版块前需要注册／登录。

## 开源与运行要求

项目仓库：https://github.com/560e/560-ai-town 。原创代码使用 [MIT许可证](LICENSE)；字体轮廓等第三方资源见 [许可说明](THIRD_PARTY_NOTICES.md)。本仓库不包含任何可直接登录的生产账号、数据库、私密环境配置或上传素材。

需要 Node.js 24+ 和 PostgreSQL 15+。这是带数据库与服务端权限的完整应用，不能直接作为纯静态站点部署。生产环境请使用Linux部署向导、HTTPS及独立随机密钥；注册后的首位超管通过运维命令明确授权，没有默认管理员密码。真实短信提供商尚未接入，不能把本地测试验证码公开上线。

## 已知安全维护事项

2026-10-28对锁定依赖执行npm audit：共6项告警（2 critical、3 high、1 low），涉及next、better-auth及其适配器、sharp、source-map-js、zod。当前公开的是回退后的V0.0.5功能基线，不代表可直接无审查部署到公网。上线前请升级修复依赖并执行账号、权限、部署回归；不要直接运行未经验证的`npm audit fix --force`。本次未变更锁定依赖版本。

## 使用说明

- [产品与功能手册](docs/产品与功能手册.md)：七区、账号身份、服务中心、三中心、多人交流
- [技术开发手册](docs/技术开发手册.md)：实现入口、数据权限、开发与验证
- [部署运维手册](docs/部署运维手册.md)：启动、Linux/宝塔、升级备份、版本发布
- [项目宣传资料](docs/项目宣传资料.md)：事实、亮点和文案使用边界
- [更新摘要](CHANGELOG.md)、[V0.0.4发布记录](docs/releases/V0.0.4.md)、[V0.0.3历史记录](docs/releases/V0.0.3.md)、[V0.0.2历史记录](docs/releases/V0.0.2.md)、[V0.0.1历史记录](docs/releases/V0.0.1.md)

## Linux部署（当前源码）

当前本地安装器目标为Debian12/13、Ubuntu22.04/24.04 LTS，systemd、x86_64/arm64。V0.0.4已完成本地单元/构建检查，功能接口及浏览器证据见发布记录；目标服务器成功证据属于此前V0.0.1，新版本升级/回滚/恢复仍需实机验收。完整教程见运维手册第0节。全新安装在解压后的项目根执行：

```bash
sudo bash deploy-linux.sh
sudo bash deploy-linux.sh --check
sudo bash deploy-linux.sh --repair
sudo bash manage-linux.sh status
sudo bash manage-linux.sh logs
sudo bash manage-linux.sh backup
sudo bash manage-linux.sh admin
```

向导提供SSH测试、公网游客预览和HTTPS密码账号三种模式；密码模式需另配证书及可信反代，真实短信尚未接入。Node、配置、素材、版本及备份归入实际项目根`.deployment/`，systemd/Nginx注册与PostgreSQL实例仍由系统管理。Ubuntu22.04需预先准备PostgreSQL15+，向导只连接已有实例。旧Debian入口兼容转发。

已有安装从新源码升级必须指定原根：`sudo bash /新源码目录/deploy-linux.sh --install-root /既有项目根`；旧/opt布局须显式迁移，不能直接新建第二实例。账号授权、备份/恢复及迁移命令见 [部署运维手册](docs/部署运维手册.md)。没有默认管理员密码。

## 本机继续开发

安装Node.js24及PostgreSQL15+，然后：

```bash
npm ci
npm run local:setup
npm run local:dev
```

默认访问 http://localhost:3000 。开发配置保存在 .env.local，不要外发。原有前台脚本 start-windows.bat、start-linux.sh 仍可用，详见[启动说明](启动说明.md)，它们不代替Linux后台部署工具。

## 验证和打包

```bash
npm run typecheck
npm test
npm run build
npm run release:pack
```

打包写入 artifacts/releases：干净源码tar.gz、SHA-256及包内文件清单。不包含node_modules、Windows构建产物、数据库、私密配置、日志和上传图片，目标机通过npm ci重新安装与构建。重复打包不会覆盖同名发布包；正常修复应登记新版本并保留旧包，正式发布步骤见运维手册。

额外集成测试 test:accounts、test:identities、test:multiplayer、test:chat、test:rooms 需要已运行且允许创建临时测试数据的本地测试环境。

## 当前边界

主地图、服务大厅与学院校园已支持同房间同场景多人；服务身份申请和资料授权已实现。学院提供外链课程目录与运营管理，点击课程新标签页前往网校，不提供站内课时、报名或学习进度。企业协作、店铺交易、任务业务和社区住宅仍为筹备模块。角色外观可配置，但没有完整换肤产品。

docs日常维护六份文档，旧设计和迭代记录保留在 [历史归档](docs/archive/README.md)，当前进度以功能状态为准。每次正式版本记录放入docs/releases；后续新增功能仍先规划并经用户确认。

宝塔与迁移说明见 [部署运维手册](docs/部署运维手册.md)。当前源码的 `migrate-baota.sh /目标项目根` 可显式迁入项目内布局并保留旧目录；用户已部署当前完整修订包，AI本轮仅更新文档；其他旧布局迁移分支仍需单独验收。本地源码仍为最终版本。



### 2026-09-23完整部署修订

最新完整0.0.1包已合并所有部署补丁。`sudo bash deploy-linux.sh --check`检查，`--repair`交互修复；正常安装数据库权限不足可输入管理员凭证，默认postgres。删库和删项目后的全新安装、同根旧服务处理及验证限制见[部署运维手册](docs/部署运维手册.md)。不要将历史补丁覆盖到本次完整包。

最新完整包SHA256：`a12594caa5a5df2b090df44a70d43c6afb95ab5d5990cdbf9db6e105fbfd53e4`。本次文档登记不重打包，包内文档为打包时快照。
