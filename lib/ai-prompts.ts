interface ItemForPrompt {
  title: string;
  type: string;
  creator: string | null;
  rating: number | null;
  review: string | null;
  tags: string[];
  finishedAt: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  BOOK: "书",
  MOVIE: "电影",
  TV: "剧集",
  GAME: "游戏",
  PLACE: "地点",
};

function formatItem(item: ItemForPrompt): string {
  const parts: string[] = [];
  const typeLabel = TYPE_LABELS[item.type] || item.type;
  parts.push(`《${item.title}》(${typeLabel})`);
  if (item.creator) parts.push(`作者/导演：${item.creator}`);
  if (item.rating) parts.push(`评分：${item.rating}/5`);
  if (item.review) parts.push(`短评：${item.review}`);
  if (item.tags.length > 0) parts.push(`标签：${item.tags.join(", ")}`);
  if (item.finishedAt) {
    const d = new Date(item.finishedAt);
    parts.push(`时间：${d.getMonth() + 1}月`);
  }
  return parts.join("，");
}

function buildItemsList(items: ItemForPrompt[]): string {
  if (items.length === 0) return "（暂无记录）";
  return items.map((item, i) => `${i + 1}. ${formatItem(item)}`).join("\n");
}

function summarizeCounts(items: ItemForPrompt[]): Record<string, number> {
  const counts: Record<string, number> = { BOOK: 0, MOVIE: 0, TV: 0, GAME: 0, PLACE: 0 };
  for (const item of items) {
    if (counts[item.type] !== undefined) counts[item.type]++;
  }
  return counts;
}

export function buildPoemPrompt(items: ItemForPrompt[], year: number): string {
  const counts = summarizeCounts(items);
  const itemsList = buildItemsList(items);

  return `你是一位以亲历者身份回望岁月的写作者。
根据以下 ${year} 年的个人记录，写一段年度回顾感悟。

【这一年的足迹】
${itemsList}

（${counts.BOOK} 本书、${counts.MOVIE} 部电影、${counts.TV} 部剧集、${counts.GAME} 款游戏）

风格参考（均为真实用户年度感悟范例，供你模仿其语感、节奏与结构）：

【参考1·2023年】
2023年，我在光影里跨越了极大的尺度。从《流浪地球》里撕裂暗寂的行星发动机，到《少年派》里倒映着太平洋星斗的虎眼，我看过宇宙的浩瀚，也经历了《悬崖之上》与《战狼2》里那些属于信仰的滚烫硝烟。
但真正让我共情的，往往是那些更私人的告别与重逢。在《寻梦环游记》万寿菊铺就的桥畔，在《关于我和鬼变成家人的那件事》荒诞却温情的纸扎前，我看着亡魂起舞，听着吉他拨响。这一年，我跟着伯恩在莫斯科的风雪中找寻身份，跟着《触不可及》在轮椅上摇曳红酒，逐渐明白了一件事：无论外面的世界是轰鸣的巨轮，还是虚拟的荒原，最终能稳稳接住我们的，始终是那些关于爱与记忆的具体瞬间。

【参考2·2024年】
2024年，屏幕里的故事变得冷峻起来，仿佛所有人都在寻找某种真相。这一年，我在《年会不能停》里跟着打工人吼出过关于未来的不甘，又在《失控玩家》的自由城里，试着触碰虚拟与现实的边界。
我见证了太多的谎言与面具：《新生》里费可空荡荡的追思会，《无双》里燃作灰烬的假钞，还有《孤注一掷》中那些永远流不回故乡的数字。更极致的博弈，在《斗牌传说》的地下室和《三体》的黑暗森林里展开，有人把命押在牌桌上，有人把枪口对准自己的心脏。在这些充满算计与牺牲的故事里沉浸得太久，我反而有了一种如释重负的清醒：人生就像一场不得不打的牌局，真正的底牌从来不在别人手里，而在你敢于亮牌、承担后果的那个瞬间。

【参考3·2025年】
2025年是一场漫长的"生还"体验。我在《开端》45路公交车的爆炸与卡农循环中，体会过无能为力的窒息；也在《狂飙》旧厂街的鱼档前，看懂了时间与命运是如何一点点改变一个人的。
这几年的主角们似乎都在教我如何面对深渊：《鱿鱼游戏》里巨型木偶注视下的生死奔逃，《黑暗荣耀》中文东恩在冰冷体育馆里熬过的漫长黑夜，亦或是伊森骑着摩托车冲下悬崖的决绝。这不再是简单的英雄主义，而是咬碎了牙往肚子里咽的韧性。关掉屏幕，这一年最大的感触是：所谓耀眼与强大，从来不是因为生来完好没有受过伤；而是像他们一样，即便碎过千百遍，依然选择一点点把自己重新拼凑起来。

【参考4·2026年】
2026年，故事的底色在极致的喧嚣与极致的静谧中交替。我在《赛博朋克2077》狗镇的酸雨里，听着百灵鸟碎玻璃般的歌声，感受过被科技裹挟的无奈；也跟着《挽救计划》里的失语者，在距离地球光年之外的深空，靠着数学和微弱的星光寻找回家的路。
但更多的时候，我在光影里学着和解。在《疯狂动物城》的晨光里，我懂得了偏见比渺小更可怕；在《性教育》那间写满涂鸦的废弃洗手间里，我听到了青春最隐秘也最真诚的告白。当我看着《飞驰人生》里，那辆赛车带着一百零九道弯的记忆再次冲向巴音布鲁克，我突然明白了什么是真正的归来。这一年，我走过很多虚拟的弯道，最终确认了一件事：比起坚不可摧的科技铠甲，真诚与共情，才是漫长岁月里最精准的导航。"

写作要求：
1. 用第一人称，像自己写年度感悟，不是对"你"说话
2. 把每部作品都当作"我"亲身游历的世界，而不是"我看了/读了/玩了"
3. 从作品中提取标志性的场景、动作、意象、台词情绪，把它们变成"我"的经历
4. 每部作品提及1-2个让人一眼能认出的标志性元素，可以自然融入作品名、地名、角色、经典台词或名场面，让读者能对应上具体是哪部剧/书/游戏；不要写得太抽象、太泛化，让人读完后完全猜不到是哪部作品
5. 诗意、有画面感，善用意象而非说理
6. 不要出现"年度最佳""评分""推荐"等评价性语言，也不要出现 emoji 和话题标签
7. 分段清晰，有呼吸感，像一首散文诗
8. 结尾收束一小段，点出你这一年从中凝聚的自我内核
9. 可以使用排比，但不要通篇全是排比
10. 自己给低分（评分≤2）的作品不要提及，不要在文中为凑数而硬写
11. 自己不熟悉的作品不要乱编细节，只写你有真切感受、能提炼出具体场景或情绪的作品
12. 不要提及看作品的具体时间（月份、日期），会破坏意境
13. 行文要有内在逻辑感，段落之间转折自然流畅，不要生硬拼接不同作品
14. 不要连续使用"后来""接着""然后""最后"等时间顺序连接词，避免写成流水账
15. 句子之间尽量整齐对仗、押韵，读起来有节奏感和韵律美
16. 200-400 字`;
}

export function buildPersonaPrompt(items: ItemForPrompt[], year: number): string {
  const counts = summarizeCounts(items);
  const total = items.length;
  const itemsList = buildItemsList(items);

  return `你是一位文化观察家。根据以下 ${year} 年的完整书/影/游记录，为你总结"年度精神画像"。

【这一年的完整记录】
${itemsList}

（共 ${total} 条：${counts.BOOK} 本书、${counts.MOVIE} 部电影、${counts.TV} 部剧集、${counts.GAME} 款游戏）

要求输出 JSON：
{
  "title": "2-10个字的称号，简洁有力，如'赛博游侠'、'讲台旅人'",
  "label": "一个精炼的标签，如'追光者'、'赛博游侠'",
  "description": "150字左右的解读，用第二人称'你'来写，诗意有洞察",
  "vibe": "2-3个关键词，描述这一年的整体气质",
  "quote": "一句点睛的总结语，用第二人称"
}`;
}

export function buildPersonalRecommendPrompt(
  userItems: ItemForPrompt[],
  count = 8
): string {
  const itemsList = buildItemsList(userItems);

  return `你是一位资深文化推荐官。根据以下用户的偏好记录，推荐 ${count} 部 TA 可能喜欢但还没看过的作品（书/电影/剧集/游戏均可）。

【用户已体验且高分的作品】
${itemsList}

要求输出 JSON 对象，包含 recommendations 数组：
{
  "recommendations": [
    {
      "title": "作品名称",
      "type": "BOOK | MOVIE | TV | GAME",
      "creator": "作者/导演/开发商",
      "year": "发行年份",
      "reason": "30字以内的推荐理由，点明和TA偏好的关联"
    }
  ]
}

要求：
1. 作品必须是真实存在的经典或口碑佳作
2. 推荐理由要个性化，引用用户喜欢的具体风格或创作者
3. 必须跨类型推荐，推荐列表中要同时覆盖电影/剧集、书籍、游戏等不同类别，不能只集中在用户原本偏好的单一类型上
4. 不要推荐用户记录中已出现的作品`;
}

export interface ChartItem {
  title: string;
  creator: string;
  rating: string;
}

export function buildHotRecommendPrompt(
  hotItems: ChartItem[],
  userItems: ItemForPrompt[],
  count = 8
): string {
  const hotList = hotItems
    .map((item, i) => `${i + 1}. 《${item.title}》${item.creator}（${item.rating}分）`)
    .join("\n");

  const userTitles = userItems.map((i) => `《${i.title}》`).join("、");

  return `你是一位文化推荐官。以下是从豆瓣榜单抓取的近期热门作品，请从中筛选出 ${count} 部最值得推荐的作品。

【豆瓣热门榜单】
${hotList}

【用户已看过的作品（请避免重复推荐）】
${userTitles || "暂无"}

要求输出 JSON 对象，包含 recommendations 数组：
{
  "recommendations": [
    {
      "title": "作品名称",
      "type": "BOOK | MOVIE | TV | GAME",
      "creator": "作者/导演/开发商",
      "year": "发行年份（可空）",
      "reason": "30字以内的推荐理由"
    }
  ]
}

要求：
1. 优先选择评分高、口碑好的作品
2. 推荐理由要口语化、有吸引力
3. 不要推荐用户已看过的作品`;
}
