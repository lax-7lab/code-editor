import { CommandDef } from "../types";

export class CommandRegistry {
  private commands = new Map<string, CommandDef>();

  register(def: CommandDef): void {
    if (this.commands.has(def.id)) {
      throw new Error(`Command with id "${def.id}" already registered`);
    }
    this.commands.set(def.id, def);
  }

  getAll(): CommandDef[] {
    return Array.from(this.commands.values());
  }

  get(id: string): CommandDef | undefined {
    return this.commands.get(id);
  }

  run(id: string): void {
    const def = this.commands.get(id);
    if (def?.run) {
      def.run();
    }
  }

  search(query: string): CommandDef[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      return this.getAll();
    }
    return this.getAll().filter(
      (cmd) =>
        cmd.id.toLowerCase().includes(lowerQuery) ||
        cmd.title.toLowerCase().includes(lowerQuery) ||
        (cmd.category?.toLowerCase().includes(lowerQuery) ?? false)
    );
  }
}

export const commandRegistry = new CommandRegistry();