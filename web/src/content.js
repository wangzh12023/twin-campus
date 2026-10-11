// UI copy (EN / ZH) and chapter definitions. The brand "Twin Campus" and all copy are fictional placeholders.
export const CHAPTERS = [
  { id: 'campus', n: '01', en: 'Smart Campus', zh: '智慧园区' },
  { id: 'hq', n: '02', en: 'Campus HQ', zh: '园区总部' },
  { id: 'twin', n: '03', en: 'Digital Twin', zh: '数字孪生' },
  { id: 'iot', n: '04', en: 'IoT', zh: 'IoT' },
  { id: 'ai', n: '05', en: 'AI', zh: 'AI' },
];

export const STRINGS = {
  en: {
    back: 'Back', skip: 'Skip animation', story: 'Story', guided: 'Guided', explore: 'Explore',
    hintIdle: 'Drag to look · Scroll to zoom', travelling: 'Travelling to ', backTo: 'Back to ',
    infoTitle: 'About this demo', infoBody: 'An open-source campus rendered in real time with three.js. Buildings, devices and states are illustrative; no live data is connected.',
  },
  zh: {
    back: '返回', skip: '跳过动画', story: '故事', guided: '引导', explore: '探索',
    hintIdle: '拖动查看 · 滚轮缩放', travelling: '正在前往 ', backTo: '返回 ',
    infoTitle: '关于本演示', infoBody: '以 three.js 实时渲染的开源园区。建筑、设备与状态均为示意，未接入任何实时数据。',
  },
};

// panel content per state. action: {label, go}  link: {label, go}
export const PANELS = {
  campus: {
    en: {
      eyebrow: 'An open-source digital twin demo',
      title: 'See the whole campus.<br>Then step inside.',
      body: 'A real-time 3D campus generated with Blender scripts and rendered with three.js. Fly from the skyline down to a single desk.',
      action: 'Fly to the HQ ↗',
    },
    zh: {
      eyebrow: '开源数字孪生演示',
      title: '俯瞰整个园区，<br>再走进其中。',
      body: '由 Blender 脚本生成、three.js 实时渲染的 3D 园区。从天际线一路飞到一张工位。',
      action: '飞往总部 ↗',
    },
    go: 'hq', wide: true,
  },
  hq: {
    en: {
      eyebrow: 'Campus HQ',
      title: 'Every building<br>has a story.<br>Make it<br>readable.',
      body: 'The headquarters tower anchors this fictional campus. Its lobby screen, office floor and devices are modelled so that space and data can be explored together.',
      action: 'Open the digital twin ↗',
      foot: 'Scenes · Aerial, street, lobby, office floor and device close-ups.<br>Stack · Blender Python, glTF, three.js and Vite.',
    },
    zh: {
      eyebrow: '园区总部',
      title: '每栋楼都有故事，<br>让它<br>一目了然。',
      body: '总部大楼是这个虚构园区的核心。大堂屏幕、办公楼层与各类设备都被完整建模，让空间与数据可以一起被探索。',
      action: '打开数字孪生 ↗',
      foot: '场景 · 航拍、街景、大堂、办公层与设备特写。<br>技术 · Blender Python、glTF、three.js 与 Vite。',
    },
    go: 'twin',
  },
  twin: {
    en: {
      eyebrow: '01 / Digital Twin',
      title: 'One screen.<br>The whole<br>campus<br>in context.',
      body: 'The lobby display mirrors the campus. Pick a building on the screen to focus it and read a short, illustrative summary.',
      action: 'Go upstairs · IoT ↗',
      foot: 'SELECT → FOCUS → INSPECT → RETURN',
    },
    zh: {
      eyebrow: '01 / 数字孪生',
      title: '一块屏幕，<br>装下<br>整个园区。',
      body: '大堂屏幕映射整个园区。在屏幕上选择一栋建筑即可聚焦，并查看一段示意性的简介。',
      action: '上楼 · IoT ↗',
      foot: '选择 → 聚焦 → 查看 → 返回',
    },
    go: 'iot',
  },
  'b-left': {
    en: { eyebrow: 'Building / West annex', title: 'West annex<br>· Studios', body: 'A low glass annex for teams and meetings. Everything shown here is placeholder content.', link: 'Back to space ←', foot: 'TEAMS · MEETINGS · DAYLIGHT' },
    zh: { eyebrow: '楼宇 / 西侧附楼', title: '西侧附楼<br>· 工作室', body: '供团队与会议使用的低层玻璃附楼。此处所有内容均为占位示意。', link: '返回空间 ←', foot: '团队 · 会议 · 采光' },
    back: 'twin', compact: true,
  },
  'b-hq': {
    en: { eyebrow: 'Building / HQ tower', title: 'HQ tower<br>· Core', body: 'The tallest building on site: blue curtain-wall glass carried on a white structural spine.', link: 'Back to space ←', foot: 'GLASS · SPINE · LOBBY · FLOORS' },
    zh: { eyebrow: '楼宇 / 总部大楼', title: '总部大楼<br>· 核心', body: '园区最高的建筑：蓝色玻璃幕墙由白色主体结构支撑。', link: '返回空间 ←', foot: '玻璃 · 主体 · 大堂 · 楼层' },
    back: 'twin', compact: true,
  },
  'b-right': {
    en: { eyebrow: 'Building / East wing', title: 'East wing<br>· Operations', body: 'A faceted wing beside the canal. Its energy and HVAC figures are invented for the demo.', link: 'Back to space ←', foot: 'ENERGY · HVAC · SERVICES' },
    zh: { eyebrow: '楼宇 / 东翼楼', title: '东翼楼<br>· 运营', body: '运河旁的多面体翼楼，能耗与暖通数据均为演示虚构。', link: '返回空间 ←', foot: '能耗 · 暖通 · 服务' },
    back: 'twin', compact: true,
  },
  'b-ring': {
    en: { eyebrow: 'Space / Ring plaza', title: 'Ring plaza<br>· Public space', body: 'A polished ring sculpture marks the entrance plaza in front of the tower stairs.', link: 'Back to space ←', foot: 'PLAZA · STAIRS · LANDSCAPE' },
    zh: { eyebrow: '空间 / 圆环广场', title: '圆环广场<br>· 公共空间', body: '一座抛光圆环雕塑标记着大楼台阶前的入口广场。', link: '返回空间 ←', foot: '广场 · 台阶 · 景观' },
    back: 'twin', compact: true,
  },
  iot: {
    en: {
      eyebrow: '02 / IoT',
      title: 'Small devices.<br>A clear<br>picture of<br>the floor.',
      body: 'Ceiling sensors, a gateway and building services sit where they would really be installed. Select a device tag to fly in and see what it does.',
      action: 'Meet the robot · AI ↗',
      foot: 'DEVICE → GATEWAY → TWIN → ACTION<br>All readings are simulated.',
    },
    zh: {
      eyebrow: '02 / IoT',
      title: '小小设备，<br>看清<br>整层楼。',
      body: '吸顶传感器、网关与楼宇设备都放在真实的安装位置。点击设备标签，飞近查看它的作用。',
      action: '认识机器人 · AI ↗',
      foot: '设备 → 网关 → 孪生 → 动作<br>所有读数均为模拟。',
    },
    go: 'ai',
  },
  'd-sensor': {
    en: { eyebrow: 'IoT / Device', title: 'Ceiling<br>multi-sensor', body: 'A domed ceiling unit that would measure temperature, air quality and presence. Here it is a static model.', link: 'Back to space ←', foot: 'Ceiling mounted · Static model' },
    zh: { eyebrow: 'IoT / 设备', title: '吸顶<br>多合一传感器', body: '一个圆顶吸顶设备，可用于测量温度、空气质量与人员存在。这里仅为静态模型。', link: '返回空间 ←', foot: '吸顶安装 · 静态模型' },
    back: 'iot', compact: true,
  },
  'd-camera': {
    en: { eyebrow: 'IoT / Device', title: 'Security<br>camera', body: 'A bullet camera on a ceiling pole near the corner glazing, modelled with its sun shield and bracket.', link: 'Back to space ←', foot: 'Static model · No video feed' },
    zh: { eyebrow: 'IoT / 设备', title: '安防摄像机', body: '安装在转角玻璃附近吊杆上的枪式摄像机，连同遮阳罩与支架一起建模。', link: '返回空间 ←', foot: '静态模型 · 无视频画面' },
    back: 'iot', compact: true,
  },
  'd-gateway': {
    en: { eyebrow: 'IoT / Device', title: 'Edge gateway', body: 'A small white box on the corridor column that would bridge the floor devices to the network.', link: 'Back to space ←', foot: 'Column mounted · Demo' },
    zh: { eyebrow: 'IoT / 设备', title: '边缘网关', body: '走廊立柱上的白色小盒子，用于把楼层设备接入网络。', link: '返回空间 ←', foot: '立柱安装 · 演示' },
    back: 'iot', compact: true,
  },
  'd-fresh': {
    en: { eyebrow: 'IoT / Device', title: 'Fresh air', body: 'A ceiling diffuser standing in for the ventilation system of the floor.', link: 'Back to space ←', foot: 'HVAC · Demo' },
    zh: { eyebrow: 'IoT / 设备', title: '新风', body: '代表本层通风系统的吸顶出风口。', link: '返回空间 ←', foot: '暖通 · 演示' },
    back: 'iot', compact: true,
  },
  'd-fire': {
    en: { eyebrow: 'IoT / Device', title: 'Fire alarm', body: 'A red manual call point next to the gateway, kept in the scene as a reference device.', link: 'Back to space ←', foot: 'Life safety · Demo' },
    zh: { eyebrow: 'IoT / 设备', title: '火灾报警', body: '网关旁的红色手动报警按钮，作为参考设备保留在场景中。', link: '返回空间 ←', foot: '生命安全 · 演示' },
    back: 'iot', compact: true,
  },
  'd-light': {
    en: { eyebrow: 'IoT / Device', title: 'Lighting', body: 'Linear ceiling lights run across the whole office floor in long parallel rows.', link: 'Back to space ←', foot: 'Lighting · Demo' },
    zh: { eyebrow: 'IoT / 设备', title: '照明', body: '线性吸顶灯以长排平行的方式铺满整个办公层。', link: '返回空间 ←', foot: '照明 · 演示' },
    back: 'iot', compact: true,
  },
  ai: {
    en: {
      eyebrow: '03 / AI',
      title: 'A robot<br>on patrol.<br>A twin<br>that follows.',
      body: 'A chrome humanoid walks the aisle between the desks and the windows. Open the semantic view to see a desk cluster lifted out as a holographic twin.',
      action: 'Open semantic view ▷',
      foot: 'WALK → OBSERVE → HIGHLIGHT → RETURN<br>The robot and hologram are visual effects only.',
    },
    zh: {
      eyebrow: '03 / AI',
      title: '机器人巡逻，<br>孪生同步跟随。',
      body: '一台金属人形机器人在工位与窗边的走道间巡逻。打开语义视图，查看一组工位被提取成全息孪生模型。',
      action: '打开语义视图 ▷',
      foot: '行走 → 观察 → 高亮 → 返回<br>机器人与全息效果仅为视觉演示。',
    },
    go: 'ai-sem', right: true,
  },
  'ai-sem': {
    en: { eyebrow: 'AI view / Semantics', title: 'Semantic ·<br>Desk cluster', body: 'Desks, chairs and monitors from one cluster are re-drawn as a floating cyan twin.', link: 'Back to space ←', foot: 'DESKS · CHAIRS · MONITORS' },
    zh: { eyebrow: 'AI 视图 / 语义', title: '语义 ·<br>工位组', body: '一组工位中的桌椅与显示器被重新绘制成悬浮的青色孪生体。', link: '返回空间 ←', foot: '桌子 · 椅子 · 显示器' },
    back: 'ai', compact: true,
  },
};

// hotspot definitions per state: anchor = name of an empty in campus.glb or explicit Blender coords
export const HOTSPOTS = {
  campus: [
    { anchor: 'HS_IOT', en: 'IoT ↗', zh: 'IoT ↗', go: 'iot', side: 'left' },
    { anchor: 'HS_DT', en: 'Digital Twin ↗', zh: '数字孪生 ↗', go: 'twin', side: 'left' },
    { anchor: 'HS_AI', en: 'AI · Office floor ↗', zh: 'AI · 办公层 ↗', go: 'ai', side: 'right' },
  ],
  hq: [
    { anchor: 'HS_DT_STREET', en: 'Digital Twin ↗', zh: '数字孪生 ↗', go: 'twin', side: 'none' },
  ],
  iot: [
    { anchor: 'DEV_SENSOR', n: '01', en: 'Multi-sensor', zh: '多合一传感器', go: 'd-sensor', side: 'right', off: [0, -38] },
    { anchor: 'DEV_GATEWAY', n: '02', en: 'Edge gateway', zh: '边缘网关', go: 'd-gateway', side: 'right', off: [0, -6] },
    { anchor: 'DEV_FRESHAIR', n: '03', en: 'Fresh air', zh: '新风', go: 'd-fresh', side: 'right', off: [0, -14] },
    { anchor: 'DEV_CAMERA', n: '04', en: 'Security', zh: '安防', go: 'd-camera', side: 'right', off: [0, -16] },
    { anchor: 'DEV_FIRE', n: '05', en: 'Fire alarm', zh: '火灾报警', go: 'd-fire', side: 'right', off: [0, 16] },
    { anchor: 'DEV_LIGHT', n: '06', en: 'Lighting', zh: '照明', go: 'd-light', side: 'right', off: [0, -24] },
  ],
  ai: [
    { anchor: 'DEV_SENSOR', n: '01', en: 'Multi-sensor', zh: '多合一传感器', go: null, side: 'right', cls: 'tag-soft' },
    { anchor: 'ROBOT_HEAD', en: 'AI VIEW / SEMANTICS', zh: 'AI 视图 / 语义', go: 'ai-sem', side: 'right', cls: 'tag' },
    { anchor: 'ROBOT_HAND', en: 'Open semantic view', zh: '打开语义视图', go: 'ai-sem', side: 'right', cls: 'tag' },
  ],
  'ai-sem': [
    { anchor: 'HOLO_LABEL', en: 'AI VIEW / SEMANTICS', zh: 'AI 视图 / 语义', go: null, side: 'right', cls: 'tag' },
  ],
};

// labels drawn on the lobby screen (u,v in screen texture space 0..1, origin top-left)
export const SCREEN_LABELS = [
  { id: 'b-left', en: 'West annex', zh: '西侧附楼' },
  { id: 'b-hq', en: 'HQ tower', zh: '总部大楼' },
  { id: 'b-right', en: 'East wing', zh: '东翼楼' },
  { id: 'b-ring', en: 'Ring plaza', zh: '圆环广场' },
];
