import { _decorator } from 'cc';
import { AutoDemoGame } from './AutoDemoGame';

const { ccclass } = _decorator;

/**
 * @deprecated 旧场景兼容壳。
 * 当前项目唯一运行时驱动逻辑已统一收敛到 AutoDemoGame。
 */
@ccclass('GameManager')
export class GameManager extends AutoDemoGame {}
