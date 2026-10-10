/**
 * CYBER CUBE TIMER - Database Module
 * Handles data persistence with IndexedDB
 */

const DB = {
    dbName: 'CyberCubeTimer',
    dbVersion: 3, // Incremented for video storage support
    db: null,

    /**
     * Initialize database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ Database opened successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;

                // Create object store for times (v1)
                if (!db.objectStoreNames.contains('times')) {
                    const objectStore = db.createObjectStore('times', {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // Create indexes
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    objectStore.createIndex('sessionCubeType', ['session', 'cubeType'], { unique: false });

                    console.log('📦 Object store created with optimized indexes');
                } else if (oldVersion < 2) {
                    // Migration from v1 to v2: Remove redundant indexes
                    const transaction = event.target.transaction;
                    const objectStore = transaction.objectStore('times');

                    // Remove old individual indexes if they exist
                    if (objectStore.indexNames.contains('session')) {
                        objectStore.deleteIndex('session');
                        console.log('🗑️ Removed redundant session index');
                    }
                    if (objectStore.indexNames.contains('cubeType')) {
                        objectStore.deleteIndex('cubeType');
                        console.log('🗑️ Removed redundant cubeType index');
                    }

                    console.log('✅ Database upgraded to v2 with optimized indexes');
                }
            };
        });
    },

    /**
     * Add a new time record
     */
    async addTime(timeData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['times'], 'readwrite');
            const objectStore = transaction.objectStore('times');
            const request = objectStore.add(timeData);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error adding time:', request.error);
                reject(request.error);
            };
        });
    },

    /**
     * Get all times for a session and cube type
     */
    async getTimes(session = 'default', cubeType = '3x3x3') {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['times'], 'readonly');
            const objectStore = transaction.objectStore('times');
            let request;

            try {
                const index = objectStore.index('sessionCubeType');
                request = index.getAll([session, cubeType]);
            } catch (e) {
                // Fallback for older DBs without the composite index
                console.warn('Composite index missing, using fallback filter:', e?.message || e);
                request = objectStore.getAll();
                request._needsFilter = true;
            }

            request.onsuccess = () => {
                let result = request.result || [];
                if (request._needsFilter) {
                    result = result.filter(r => r.session === session && r.cubeType === cubeType);
                }
                // Sort by timestamp descending (newest first)
                const times = result.sort((a, b) => b.timestamp - a.timestamp);
                resolve(times);
            };

            request.onerror = () => {
                console.error('Error getting times:', request.error);
                reject(request.error);
            };
        });
    },

    /**
     * Get a single time by ID
     */
    async getTime(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['times'], 'readonly');
            const objectStore = transaction.objectStore('times');
            const request = objectStore.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error getting time:', request.error);
                reject(request.error);
            };
        });
    },

    /**
     * Update a time record
     */
    async updateTime(id, updates) {
        // Get existing record
        const existingTime = await this.getTime(id);
        if (!existingTime) {
            throw new Error('Time not found');
        }

        // Merge updates
        const updatedTime = { ...existingTime, ...updates };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['times'], 'readwrite');
            const objectStore = transaction.objectStore('times');
            const request = objectStore.put(updatedTime);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error updating time:', request.error);
                reject(request.error);
            };
        });
    },

    /**
     * Delete a time record
     */
    async deleteTime(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['times'], 'readwrite');
            const objectStore = transaction.objectStore('times');
            const request = objectStore.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                console.error('Error deleting time:', request.error);
                reject(request.error);
            };
        });
    },

    /**
     * Clear all times for a session and cube type
     */
    async clearTimes(session = 'default', cubeType = '3x3x3') {
        const times = await this.getTimes(session, cubeType);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['times'], 'readwrite');
            const objectStore = transaction.objectStore('times');

            for (const time of times) {
                objectStore.delete(time.id);
            }

            transaction.oncomplete = () => {
                resolve();
            };

            transaction.onerror = () => {
                console.error('Error clearing times:', transaction.error);
                reject(transaction.error);
            };
        });
    },

    /**
     * Get all sessions
     */
    async getSessions() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['times'], 'readonly');
            const objectStore = transaction.objectStore('times');
            const request = objectStore.getAll();

            request.onsuccess = () => {
                const sessions = [...new Set(request.result.map(t => t.session))];
                resolve(sessions);
            };

            request.onerror = () => {
                console.error('Error getting sessions:', request.error);
                reject(request.error);
            };
        });
    },

    /**
     * Export all data
     */
    async exportAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['times'], 'readonly');
            const objectStore = transaction.objectStore('times');
            const request = objectStore.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error exporting data:', request.error);
                reject(request.error);
            };
        });
    },

    /**
     * Import data
     */
    async importData(data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['times'], 'readwrite');
            const objectStore = transaction.objectStore('times');

            for (const record of data) {
                // Remove id to let IndexedDB generate new ones
                const { id, ...recordWithoutId } = record;
                objectStore.add(recordWithoutId);
            }

            transaction.oncomplete = () => {
                resolve();
            };

            transaction.onerror = () => {
                console.error('Error importing data:', transaction.error);
                reject(transaction.error);
            };
        });
    }
};

// Make DB globally available
window.DB = DB;
