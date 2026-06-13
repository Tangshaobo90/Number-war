# 唐少博的数字战争

一个基于 React、TypeScript、Vite 的 6x6 数字合成游戏。

## 本地运行

```bash
npm install
npm run dev
```

## 测试

```bash
npm test
```

## 构建

```bash
npm run build
```

## 规则摘要

- 点击空格放置当前主数字。
- 三个上下左右连通的相同数字自动合成下一级。
- 合成才加分，普通放置不加分。
- 撤销、铲子、魔法棒、炸弹每局各 1 次。
- 高分、最高数字、局数和时长保存在 `localStorage`。
