import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a data directory at the project root for storing documents
const DATA_DIR = path.join(__dirname, '../../../../data/documents');

export class StorageService {
  constructor() {
    this.ensureDataDirectory();
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.access(DATA_DIR);
    } catch {
      await fs.mkdir(DATA_DIR, { recursive: true });
      console.log(`Created data directory at: ${DATA_DIR}`);
    }
  }

  async saveDocument(id: string, data: unknown): Promise<void> {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async getDocument(id: string): Promise<unknown | null> {
    try {
      const filePath = path.join(DATA_DIR, `${id}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async getAllDocuments(): Promise<unknown[]> {
    try {
      const files = await fs.readdir(DATA_DIR);
      const documents = await Promise.all(
        files
          .filter(file => file.endsWith('.json'))
          .map(async file => {
            const data = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
            return JSON.parse(data);
          })
      );
      return documents;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await this.ensureDataDirectory();
        return [];
      }
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      const filePath = path.join(DATA_DIR, `${id}.json`);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async documentExists(id: string): Promise<boolean> {
    try {
      const filePath = path.join(DATA_DIR, `${id}.json`);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}