/**
 * 文献评审数据管理模块
 * 负责存储和管理文献的自定义评审字段
 */

export interface ReviewField {
    id: string;
    name: string;
    type: "text" | "select" | "number" | "date" | "boolean";
    options?: string[]; // 用于select类型
    defaultValue?: any;
}

export interface ReviewData {
    itemID: number;
    fields: { [fieldId: string]: any };
    updatedAt: number;
}

export class ReviewDataManager {
    private static readonly STORAGE_KEY = "zotero-review-data";
    private static readonly FIELDS_KEY = "zotero-review-fields";

    /**
     * 获取所有自定义字段定义
     */
    static getFields(): ReviewField[] {
        const fieldsJson = Zotero.Prefs.get(this.FIELDS_KEY, true) as string;
        if (!fieldsJson) {
            return this.getDefaultFields();
        }
        try {
            return JSON.parse(fieldsJson);
        } catch (e) {
            ztoolkit.log("Failed to parse review fields", e);
            return this.getDefaultFields();
        }
    }

    /**
     * 保存自定义字段定义
     */
    static setFields(fields: ReviewField[]): void {
        Zotero.Prefs.set(this.FIELDS_KEY, JSON.stringify(fields), true);
    }

    /**
     * 添加新字段
     */
    static addField(field: ReviewField): void {
        const fields = this.getFields();
        fields.push(field);
        this.setFields(fields);
    }

    /**
     * 更新字段
     */
    static updateField(fieldId: string, updates: Partial<ReviewField>): void {
        const fields = this.getFields();
        const index = fields.findIndex((f) => f.id === fieldId);
        if (index !== -1) {
            fields[index] = { ...fields[index], ...updates };
            this.setFields(fields);
        }
    }

    /**
     * 删除字段
     */
    static deleteField(fieldId: string): void {
        const fields = this.getFields().filter((f) => f.id !== fieldId);
        this.setFields(fields);

        // 同时删除所有条目中该字段的数据
        const allData = this.getAllReviewData();
        allData.forEach((data) => {
            delete data.fields[fieldId];
        });
        this.saveAllReviewData(allData);
    }

    /**
     * 获取默认字段配置
     */
    private static getDefaultFields(): ReviewField[] {
        return [
            {
                id: "relevance",
                name: "相关性",
                type: "select",
                options: ["高", "中", "低", "不相关"],
                defaultValue: "",
            },
            {
                id: "quality",
                name: "质量评分",
                type: "select",
                options: ["A", "B", "C", "D"],
                defaultValue: "",
            },
            {
                id: "included",
                name: "是否纳入",
                type: "boolean",
                defaultValue: false,
            },
            {
                id: "notes",
                name: "评审备注",
                type: "text",
                defaultValue: "",
            },
        ];
    }

    /**
     * 获取条目的评审数据
     */
    static getReviewData(itemID: number): ReviewData | null {
        const allData = this.getAllReviewData();
        return allData.find((d) => d.itemID === itemID) || null;
    }

    /**
     * 保存条目的评审数据
     */
    static setReviewData(itemID: number, fields: { [fieldId: string]: any }): void {
        const allData = this.getAllReviewData();
        const index = allData.findIndex((d) => d.itemID === itemID);

        const reviewData: ReviewData = {
            itemID,
            fields,
            updatedAt: Date.now(),
        };

        if (index !== -1) {
            allData[index] = reviewData;
        } else {
            allData.push(reviewData);
        }

        this.saveAllReviewData(allData);
    }

    /**
     * 更新条目的单个字段
     */
    static updateReviewField(itemID: number, fieldId: string, value: any): void {
        const data = this.getReviewData(itemID);
        const fields = data ? { ...data.fields } : {};
        fields[fieldId] = value;
        this.setReviewData(itemID, fields);
    }

    /**
     * 获取所有评审数据
     */
    static getAllReviewData(): ReviewData[] {
        const dataJson = Zotero.Prefs.get(this.STORAGE_KEY, true) as string;
        if (!dataJson) {
            return [];
        }
        try {
            return JSON.parse(dataJson);
        } catch (e) {
            ztoolkit.log("Failed to parse review data", e);
            return [];
        }
    }

    /**
     * 保存所有评审数据
     */
    private static saveAllReviewData(data: ReviewData[]): void {
        Zotero.Prefs.set(this.STORAGE_KEY, JSON.stringify(data), true);
    }

    /**
     * 清空所有评审数据
     */
    static clearAllData(): void {
        Zotero.Prefs.clear(this.STORAGE_KEY, true);
    }

    /**
     * 导出评审数据为JSON
     */
    static exportToJSON(): string {
        const fields = this.getFields();
        const data = this.getAllReviewData();

        return JSON.stringify(
            {
                version: "1.0",
                fields,
                data,
                exportedAt: new Date().toISOString(),
            },
            null,
            2
        );
    }

    /**
     * 导出评审数据为CSV
     */
    static async exportToCSV(): Promise<string> {
        const fields = this.getFields();
        const data = this.getAllReviewData();

        // 构建CSV头部
        const headers = [
            "Item ID",
            "标题",
            "作者",
            "年份",
            "期刊",
            "DOI",
            ...fields.map((f) => f.name),
        ];

        const rows: string[][] = [headers];

        // 构建CSV数据行
        for (const reviewData of data) {
            try {
                const item = await Zotero.Items.getAsync(reviewData.itemID);
                if (!item || item.isNote() || item.isAttachment()) {
                    continue;
                }

                const row = [
                    String(reviewData.itemID),
                    this.escapeCSV(item.getField("title") as string),
                    this.escapeCSV(item.getCreators().map((c) => c.firstName + " " + c.lastName).join("; ")),
                    this.escapeCSV(item.getField("date") as string),
                    this.escapeCSV(item.getField("publicationTitle") as string),
                    this.escapeCSV(item.getField("DOI") as string),
                    ...fields.map((f) => this.escapeCSV(String(reviewData.fields[f.id] || ""))),
                ];

                rows.push(row);
            } catch (e) {
                ztoolkit.log(`Failed to process item ${reviewData.itemID}`, e);
            }
        }

        // 转换为CSV字符串
        return rows.map((row) => row.join(",")).join("\n");
    }

    /**
     * CSV字段转义
     */
    private static escapeCSV(value: string): string {
        if (!value) return "";
        // 如果包含逗号、引号或换行符，需要用引号包裹并转义内部引号
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    /**
     * 生成唯一ID
     */
    static generateId(): string {
        return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
