# 第三方素材与许可

- 项目自行编写的源码按根目录 LICENSE（MIT）开放；第三方依赖保持其各自许可，详见 package-lock.json 与各依赖包。
- `data/sign-glyphs.json` 为 Noto Sans SC 的招牌字符轮廓衍生数据，按 SIL Open Font License 1.1 分发，不改为 MIT。完整许可在 `public/licenses/NotoSansSC-OFL.txt`。原项目字体来源：https://github.com/google/fonts/tree/main/ofl/notosanssc ，项目仅附使用到的字形，不打包系统字体。重建时安装 Noto Sans SC 并运行 `scripts/build-sign-glyphs.ps1`。
- 背景环境音由项目本地程序合成，未包含外部音频采样；来源说明在 public/audio 中。主地图模型为程序化几何，天空为本地生成贴图。
- 写实化实验、Blender运行时和实验素材均不属于本开源项目。
- MIT许可证不授予项目公司名称、标志或商标的权利，也不代表对衍生服务的背书。
