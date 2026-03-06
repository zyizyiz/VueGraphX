import JXG from 'jsxgraph';
import type { ShapeCapabilityTarget } from '../../capabilities/contracts';
import type { GraphShapeContext, GraphShapeGroup, GraphShapeGroupInput, GraphShapeGroupMember, GraphShapeInstance } from '../contracts';

export abstract class BaseShapeInstance<StateType = Record<string, never>> implements GraphShapeInstance {
  public abstract readonly id: string;
  public abstract readonly entityType: string;

  protected readonly context: GraphShapeContext;
  protected state: StateType;
  protected selected = false;
  private readonly ownedObjects = new Set<any>();
  private readonly ownedGroups = new Map<string, GraphShapeGroup>();

  constructor(context: GraphShapeContext, initialState: StateType) {
    this.context = context;
    this.state = initialState;
  }

  public setSelected(selected: boolean): void {
    if (this.selected === selected) return;
    this.selected = selected;
    this.onSelectionChange(selected);
    this.notifyStateChange();
  }

  public onBoardDown(_e: any, _isClickingObject: boolean): void {}
  public onBoardUp(_e: any, _isClickingObject: boolean): void {}
  public onBoardUpdate(): void {}
  public abstract getCapabilityTarget(): ShapeCapabilityTarget | null;

  public destroy(): void {
    const groupedMembers = new Set<any>();
    Array.from(this.ownedGroups.values()).reverse().forEach((group) => {
      group.members.forEach((member) => groupedMembers.add(member.object));
      this.removeGroupSafe(group);
    });

    Array.from(this.ownedObjects).reverse().forEach((objectRef) => {
      if (groupedMembers.has(objectRef)) return;
      this.removeObjectSafe(objectRef);
    });

    this.ownedGroups.clear();
    this.ownedObjects.clear();
  }

  protected onSelectionChange(_selected: boolean): void {}

  protected get engine() {
    return this.context.engine;
  }

  protected get board() {
    return this.context.board;
  }

  protected setState(partialState: Partial<StateType>): void {
    this.state = { ...this.state, ...partialState };
    this.notifyStateChange();
  }

  protected notifyStateChange(): void {
    this.context.notifyChange();
  }

  protected trackObject<T>(objectRef: T): T {
    if (objectRef) {
      this.ownedObjects.add(objectRef);
    }
    return objectRef;
  }

  protected createGroup(groupInput: GraphShapeGroupInput, options?: { id?: string; createNativeGroup?: boolean }): GraphShapeGroup {
    const groupId = options?.id ?? this.uid('group');
    const rawMembers = Array.isArray(groupInput)
      ? groupInput
          .filter(Boolean)
          .map((objectRef, index) => ({ key: `member_${index}`, object: objectRef }))
      : Object.entries(groupInput)
          .filter(([, objectRef]) => !!objectRef)
          .map(([key, object]) => ({ key, object }));

    const members: GraphShapeGroupMember[] = rawMembers.map(({ key, object }, index) => ({
      id: `${groupId}:${key}:${index}`,
      key,
      object: this.trackObject(object)
    }));

    let nativeGroup: any | null = null;

    if ((options?.createNativeGroup ?? true) && this.board && members.length > 0) {
      try {
        nativeGroup = this.board.create('group', members.map((member) => member.object));
      } catch {
        nativeGroup = null;
      }
    }

    const group = this.createGroupView(groupId, members, nativeGroup);

    this.ownedGroups.set(group.id, group);
    return group;
  }

  protected removeGroup(group: GraphShapeGroup): void {
    this.removeGroupSafe(group);
  }

  protected selectSelf(): void {
    this.context.selectShape(this.id);
  }

  protected deselectSelf(): void {
    if (this.context.isShapeSelected(this.id)) {
      this.context.selectShape(null);
    }
  }

  protected removeSelf(): void {
    this.context.removeShape(this.id);
  }

  protected addShape(instance: GraphShapeInstance): void {
    this.context.addShape(instance);
  }

  protected getUsrCoordFromEvent(event: any): [number, number] | null {
    return this.context.getUsrCoordFromEvent(event);
  }

  protected removeObjectSafe(objectRef: any): void {
    try {
      if (this.board && objectRef) this.board.removeObject(objectRef);
    } catch {
      // ignore
    }
  }

  protected uid(prefix = 'id'): string {
    return this.context.generateId(prefix);
  }

  private removeGroupSafe(group: GraphShapeGroup): void {
    group.off();

    if (group.nativeGroup) {
      this.removeObjectSafe(group.nativeGroup);
    }

    Array.from(group.members).reverse().forEach((member) => {
      this.removeObjectSafe(member.object);
      this.ownedObjects.delete(member.object);
    });

    this.ownedGroups.delete(group.id);
  }

  protected toScreenCoordinates(x: number, y: number): { x: number; y: number } | null {
    if (!this.board) return null;
    const coords = new JXG.Coords(JXG.COORDS_BY_USER, [x, y], this.board);
    return {
      x: coords.scrCoords[1],
      y: coords.scrCoords[2]
    };
  }

  private createGroupView(
    groupId: string,
    members: GraphShapeGroupMember[],
    nativeGroup: any | null,
    listenerEntries: Array<{ eventName: string; memberKey: string; dispose: () => void }> = []
  ): GraphShapeGroup {
    const memberMap = new Map(members.map((member) => [member.key, member]));
    const resolveMembers = (keys?: string | string[]): GraphShapeGroupMember[] => {
      if (keys === undefined) return [...members];
      const keyList = Array.isArray(keys) ? keys : [keys];
      return keyList
        .map((key) => memberMap.get(key))
        .filter((member): member is GraphShapeGroupMember => !!member);
    };

    return {
      id: groupId,
      members,
      nativeGroup,
      getMember: (key: string) => memberMap.get(key) ?? null,
      getObject: (key: string) => memberMap.get(key)?.object ?? null,
      has: (key: string) => memberMap.has(key),
      keys: () => members.map((member) => member.key),
      pick: (keys: string | string[]) => {
        const pickedMembers = resolveMembers(keys);
        return this.createGroupView(groupId, pickedMembers, nativeGroup, listenerEntries);
      },
      forEach: (callback, keys) => {
        resolveMembers(keys).forEach((member) => callback(member));
      },
      setAttribute: (attributes, keys) => {
        resolveMembers(keys).forEach((member) => {
          if (member.object && typeof member.object.setAttribute === 'function') {
            member.object.setAttribute(attributes);
          }
        });
      },
      setVisible: (visible, keys) => {
        resolveMembers(keys).forEach((member) => {
          if (member.object && typeof member.object.setAttribute === 'function') {
            member.object.setAttribute({ visible });
          }
        });
      },
      show: (keys) => {
        resolveMembers(keys).forEach((member) => {
          if (member.object && typeof member.object.setAttribute === 'function') {
            member.object.setAttribute({ visible: true });
          }
        });
      },
      hide: (keys) => {
        resolveMembers(keys).forEach((member) => {
          if (member.object && typeof member.object.setAttribute === 'function') {
            member.object.setAttribute({ visible: false });
          }
        });
      },
      on: (eventName, handler, keys) => {
        const targetMembers = resolveMembers(keys);
        const disposers: Array<() => void> = [];
        targetMembers.forEach((member) => {
          if (!member.object || typeof member.object.on !== 'function') return;
          const wrappedHandler = (...args: any[]) => handler(member, ...args);
          member.object.on(eventName, wrappedHandler);
          const dispose = typeof member.object.off === 'function'
            ? () => member.object.off(eventName, wrappedHandler)
            : () => undefined;
          listenerEntries.push({ eventName, memberKey: member.key, dispose });
          disposers.push(dispose);
        });
        return () => {
          disposers.forEach((dispose) => dispose());
          for (let index = listenerEntries.length - 1; index >= 0; index -= 1) {
            if (disposers.includes(listenerEntries[index].dispose)) {
              listenerEntries.splice(index, 1);
            }
          }
        };
      },
      off: (eventName?: string, keys?: string | string[]) => {
        const targetKeys = new Set(resolveMembers(keys).map((member) => member.key));
        for (let index = listenerEntries.length - 1; index >= 0; index -= 1) {
          const entry = listenerEntries[index];
          if (eventName !== undefined && entry.eventName !== eventName) continue;
          if (keys !== undefined && !targetKeys.has(entry.memberKey)) continue;
          entry.dispose();
          listenerEntries.splice(index, 1);
        }
      }
    };
  }
}
