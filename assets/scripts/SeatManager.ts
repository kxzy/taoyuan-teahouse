import { Color, Label, Node, Sprite } from 'cc';

const SEAT_OCCUPIED_COLOR = new Color(255, 232, 185, 255);
const SEAT_IDLE_COLOR = new Color(255, 255, 255, 235);
const SEAT_OCCUPIED_LABEL_COLOR = new Color(255, 226, 150, 255);
const SEAT_IDLE_LABEL_COLOR = new Color(220, 255, 205, 235);

export class SeatManager {
  private seatNodes: Node[] = [];
  private seatStatusLabels: Array<Label | null> = [];
  private occupiedSeats = new Set<number>();

  setBindings(seatNodes: Node[], seatStatusLabels: Array<Label | null> = []): void {
    this.seatNodes = seatNodes;
    this.seatStatusLabels = seatStatusLabels;
  }

  occupy(index: number): void {
    this.occupiedSeats.add(index);
  }

  release(index: number): void {
    this.occupiedSeats.delete(index);
  }

  clearOccupancy(): void {
    this.occupiedSeats.clear();
  }

  findFreeSeatIndex(unlockedSeatCount: number): number {
    const maxSeatCount = Math.min(unlockedSeatCount, this.seatNodes.length);
    for (let i = 0; i < maxSeatCount; i += 1) {
      if (!this.occupiedSeats.has(i)) {
        return i;
      }
    }
    return -1;
  }

  getSeatNode(index: number): Node | null {
    return this.seatNodes[index] ?? null;
  }

  refreshView(unlockedSeatCount: number): void {
    const unlockedCount = Math.min(unlockedSeatCount, this.seatNodes.length);
    for (let i = 0; i < this.seatNodes.length; i += 1) {
      const seat = this.seatNodes[i];
      const isUnlocked = i < unlockedCount;
      const isOccupied = this.occupiedSeats.has(i);
      seat.active = isUnlocked;
      if (!isUnlocked) {
        continue;
      }

      const sprite = seat.getComponent(Sprite);
      if (sprite) {
        sprite.color = isOccupied ? SEAT_OCCUPIED_COLOR : SEAT_IDLE_COLOR;
      }

      const statusLabel = this.seatStatusLabels[i];
      if (statusLabel) {
        statusLabel.string = isOccupied ? '等茶' : '空座';
        statusLabel.color = isOccupied ? SEAT_OCCUPIED_LABEL_COLOR : SEAT_IDLE_LABEL_COLOR;
      }
    }
  }
}
