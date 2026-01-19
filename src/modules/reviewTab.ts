/**
 * 文献评审表格Tab页面
 * 在Zotero主窗口创建一个专门的表格视图用于文献评审
 */

import { ReviewDataManager, ReviewField, ReviewData } from "./reviewData";
import { getString } from "../utils/locale";

export class ReviewTabFactory {
    private static tabId = "zotero-review-tab";
    private static tableId = "zotero-review-table";

    /**
     * 注册评审Tab页面
     */
    static registerReviewTab() {
        // 在主窗口菜单中添加"打开评审视图"选项
        ztoolkit.Menu.register("menuTools", {
            tag: "menuitem",
            id: "zotero-review-open-tab",
            label: getString("review-tab-menu-label"),
            commandListener: () => this.openReviewTab(),
        });
    }

    /**
     * 打开评审Tab
     */
    static async openReviewTab() {
        const win = Zotero.getMainWindow();
        if (!win) return;

        // 检查Tab是否已经存在
        // @ts-ignore - getTabByID exists in Zotero 7
        const existingTab = win.Zotero_Tabs.getTabByID(this.tabId);
        if (existingTab) {
            win.Zotero_Tabs.select(existingTab);
            return;
        }

        // 创建新Tab
        const tab = win.Zotero_Tabs.add({
            id: this.tabId,
            type: "zotero-review",
            title: getString("review-tab-title"),
            select: true,
            onClose: () => {
                ztoolkit.log("Review tab closed");
            },
        });

        // 创建Tab内容
        await this.createTabContent(tab);
    }

    /**
     * 创建Tab内容
     */
    private static async createTabContent(tab: any) {
        const win = Zotero.getMainWindow();
        if (!win) return;

        const doc = tab.ownerDocument;
        const container = doc.createElement("vbox");
        container.setAttribute("flex", "1");
        container.setAttribute("id", "review-tab-container");

        // 创建工具栏
        const toolbar = this.createToolbar(doc);
        container.appendChild(toolbar);

        // 创建表格容器
        const tableContainer = doc.createElement("vbox");
        tableContainer.setAttribute("flex", "1");
        tableContainer.setAttribute("id", "review-table-container");
        container.appendChild(tableContainer);

        // 创建表格
        await this.createTable(tableContainer);

        // 将容器添加到Tab
        tab.appendChild(container);
    }

    /**
     * 创建工具栏
     */
    private static createToolbar(doc: Document): XUL.Box {
        const toolbar = ztoolkit.UI.createElement(doc, "hbox", {
            namespace: "xul",
            attributes: {
                id: "review-toolbar",
                align: "center",
            },
            styles: {
                padding: "8px",
                borderBottom: "1px solid var(--fill-quinary)",
            },
        });

        // 添加列管理按钮
        const manageColumnsBtn = ztoolkit.UI.createElement(doc, "button", {
            namespace: "xul",
            attributes: {
                label: getString("review-manage-columns"),
            },
            listeners: [
                {
                    type: "command",
                    listener: () => this.openColumnManager(),
                },
            ],
        });
        toolbar.appendChild(manageColumnsBtn);

        // 添加刷新按钮
        const refreshBtn = ztoolkit.UI.createElement(doc, "button", {
            namespace: "xul",
            attributes: {
                label: getString("review-refresh"),
            },
            listeners: [
                {
                    type: "command",
                    listener: () => this.refreshTable(),
                },
            ],
        });
        toolbar.appendChild(refreshBtn);

        // 添加导出按钮
        const exportMenu = this.createExportMenu(doc);
        toolbar.appendChild(exportMenu);

        // 添加分隔符
        const spacer = ztoolkit.UI.createElement(doc, "spacer", {
            namespace: "xul",
            attributes: {
                flex: "1",
            },
        });
        toolbar.appendChild(spacer);

        // 添加统计信息
        const statsLabel = ztoolkit.UI.createElement(doc, "label", {
            namespace: "xul",
            attributes: {
                id: "review-stats-label",
                value: this.getStatsText(),
            },
        });
        toolbar.appendChild(statsLabel);

        return toolbar as XUL.Box;
    }

    /**
     * 创建导出菜单
     */
    private static createExportMenu(doc: Document): XUL.MenuList {
        const menuButton = ztoolkit.UI.createElement(doc, "button", {
            namespace: "xul",
            attributes: {
                label: getString("review-export"),
                type: "menu",
            },
        });

        const menupopup = ztoolkit.UI.createElement(doc, "menupopup", {
            namespace: "xul",
        });

        // CSV导出
        const csvItem = ztoolkit.UI.createElement(doc, "menuitem", {
            namespace: "xul",
            attributes: {
                label: getString("review-export-csv"),
            },
            listeners: [
                {
                    type: "command",
                    listener: () => this.exportData("csv"),
                },
            ],
        });
        menupopup.appendChild(csvItem);

        // JSON导出
        const jsonItem = ztoolkit.UI.createElement(doc, "menuitem", {
            namespace: "xul",
            attributes: {
                label: getString("review-export-json"),
            },
            listeners: [
                {
                    type: "command",
                    listener: () => this.exportData("json"),
                },
            ],
        });
        menupopup.appendChild(jsonItem);

        menuButton.appendChild(menupopup);
        // @ts-ignore - Type conversion for XUL elements
        return menuButton as XUL.MenuList;
    }

    /**
     * 创建表格
     */
    private static async createTable(container: XUL.Box) {
        const doc = container.ownerDocument;
        if (!doc) return;

        // 使用虚拟表格组件
        const tableElement = doc.createElement("div");
        tableElement.setAttribute("id", this.tableId);
        tableElement.style.width = "100%";
        tableElement.style.height = "100%";
        tableElement.style.overflow = "auto";

        container.appendChild(tableElement);

        await this.renderTable();
    }

    /**
     * 渲染表格数据
     */
    private static async renderTable() {
        const win = Zotero.getMainWindow();
        if (!win) return;

        const doc = win.document;
        const tableElement = doc.getElementById(this.tableId);
        if (!tableElement) return;

        // 清空现有内容
        tableElement.innerHTML = "";

        // 获取字段定义和数据
        const fields = ReviewDataManager.getFields();
        const reviewDataList = ReviewDataManager.getAllReviewData();

        // 创建HTML表格
        const table = doc.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.fontSize = "12px";

        // 创建表头
        const thead = doc.createElement("thead");
        const headerRow = doc.createElement("tr");

        // 固定列
        const fixedHeaders = ["ID", "标题", "作者", "年份", "期刊"];
        fixedHeaders.forEach((header) => {
            const th = doc.createElement("th");
            th.textContent = header;
            th.style.padding = "8px";
            th.style.borderBottom = "2px solid var(--fill-quinary)";
            th.style.textAlign = "left";
            th.style.position = "sticky";
            th.style.top = "0";
            th.style.backgroundColor = "var(--material-background)";
            th.style.zIndex = "10";
            headerRow.appendChild(th);
        });

        // 自定义字段列
        fields.forEach((field) => {
            const th = doc.createElement("th");
            th.textContent = field.name;
            th.style.padding = "8px";
            th.style.borderBottom = "2px solid var(--fill-quinary)";
            th.style.textAlign = "left";
            th.style.position = "sticky";
            th.style.top = "0";
            th.style.backgroundColor = "var(--material-background)";
            th.style.zIndex = "10";
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // 创建表体
        const tbody = doc.createElement("tbody");

        // 获取当前库的所有常规条目
        const items = await Zotero.Items.getAll(
            Zotero.Libraries.userLibraryID,
            false,
            false,
            false
        );

        for (const item of items) {
            if (!item.isRegularItem()) continue;

            const row = doc.createElement("tr");
            row.style.borderBottom = "1px solid var(--fill-quinary)";

            // 鼠标悬停效果
            row.addEventListener("mouseenter", () => {
                row.style.backgroundColor = "var(--fill-secondary)";
            });
            row.addEventListener("mouseleave", () => {
                row.style.backgroundColor = "";
            });

            // 点击选中条目
            row.addEventListener("click", () => {
                const zoteroPane = win.ZoteroPane;
                if (zoteroPane) {
                    zoteroPane.selectItem(item.id);
                }
            });

            // ID列
            const idCell = doc.createElement("td");
            idCell.textContent = String(item.id);
            idCell.style.padding = "8px";
            row.appendChild(idCell);

            // 标题列
            const titleCell = doc.createElement("td");
            titleCell.textContent = item.getField("title") as string || "";
            titleCell.style.padding = "8px";
            titleCell.style.maxWidth = "300px";
            titleCell.style.overflow = "hidden";
            titleCell.style.textOverflow = "ellipsis";
            titleCell.style.whiteSpace = "nowrap";
            row.appendChild(titleCell);

            // 作者列
            const authorCell = doc.createElement("td");
            const creators = item.getCreators();
            authorCell.textContent = creators
                .map((c) => `${c.firstName} ${c.lastName}`.trim())
                .join(", ");
            authorCell.style.padding = "8px";
            authorCell.style.maxWidth = "200px";
            authorCell.style.overflow = "hidden";
            authorCell.style.textOverflow = "ellipsis";
            row.appendChild(authorCell);

            // 年份列
            const yearCell = doc.createElement("td");
            const dateField = item.getField("date") as string || "";
            const yearMatch = dateField.match(/\d{4}/);
            yearCell.textContent = yearMatch ? yearMatch[0] : "";
            yearCell.style.padding = "8px";
            row.appendChild(yearCell);

            // 期刊列
            const journalCell = doc.createElement("td");
            journalCell.textContent = item.getField("publicationTitle") as string || "";
            journalCell.style.padding = "8px";
            journalCell.style.maxWidth = "200px";
            journalCell.style.overflow = "hidden";
            journalCell.style.textOverflow = "ellipsis";
            row.appendChild(journalCell);

            // 获取评审数据
            const reviewData = ReviewDataManager.getReviewData(item.id);

            // 自定义字段列
            fields.forEach((field) => {
                const cell = doc.createElement("td");
                cell.style.padding = "4px";

                const value = reviewData?.fields[field.id] ?? field.defaultValue ?? "";

                // 根据字段类型创建不同的编辑控件
                if (field.type === "select" && field.options) {
                    const select = doc.createElement("select");
                    select.style.width = "100%";
                    select.style.padding = "4px";

                    // 添加空选项
                    const emptyOption = doc.createElement("option");
                    emptyOption.value = "";
                    emptyOption.textContent = "-";
                    select.appendChild(emptyOption);

                    field.options.forEach((option) => {
                        const optionElement = doc.createElement("option");
                        optionElement.value = option;
                        optionElement.textContent = option;
                        if (value === option) {
                            optionElement.selected = true;
                        }
                        select.appendChild(optionElement);
                    });

                    select.addEventListener("change", () => {
                        ReviewDataManager.updateReviewField(item.id, field.id, select.value);
                        this.updateStats();
                    });

                    cell.appendChild(select);
                } else if (field.type === "boolean") {
                    const checkbox = doc.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.checked = Boolean(value);
                    checkbox.addEventListener("change", () => {
                        ReviewDataManager.updateReviewField(item.id, field.id, checkbox.checked);
                        this.updateStats();
                    });
                    cell.appendChild(checkbox);
                } else {
                    const input = doc.createElement("input");
                    input.type = field.type === "number" ? "number" : "text";
                    input.value = String(value);
                    input.style.width = "100%";
                    input.style.padding = "4px";
                    input.addEventListener("change", () => {
                        const newValue = field.type === "number" ? Number(input.value) : input.value;
                        ReviewDataManager.updateReviewField(item.id, field.id, newValue);
                        this.updateStats();
                    });
                    cell.appendChild(input);
                }

                row.appendChild(cell);
            });

            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        tableElement.appendChild(table);

        this.updateStats();
    }

    /**
     * 刷新表格
     */
    static async refreshTable() {
        await this.renderTable();
        new ztoolkit.ProgressWindow(addon.data.config.addonName)
            .createLine({
                text: getString("review-refreshed"),
                type: "success",
                progress: 100,
            })
            .show();
    }

    /**
     * 打开列管理器
     */
    static openColumnManager() {
        addon.hooks.onDialogEvents("columnManager");
    }

    /**
     * 导出数据
     */
    static async exportData(format: "csv" | "json") {
        try {
            let content: string;
            let filename: string;
            let filterName: string;
            let filterExtension: string;

            if (format === "csv") {
                content = await ReviewDataManager.exportToCSV();
                filename = `zotero-review-export-${new Date().toISOString().split("T")[0]}.csv`;
                filterName = "CSV File";
                filterExtension = "*.csv";
            } else {
                content = ReviewDataManager.exportToJSON();
                filename = `zotero-review-export-${new Date().toISOString().split("T")[0]}.json`;
                filterName = "JSON File";
                filterExtension = "*.json";
            }

            const path = await new ztoolkit.FilePicker(
                getString("review-export-title"),
                "save",
                [[filterName, filterExtension]],
                filename
            ).open();

            if (path) {
                await Zotero.File.putContentsAsync(path, content);
                new ztoolkit.ProgressWindow(addon.data.config.addonName)
                    .createLine({
                        text: getString("review-export-success"),
                        type: "success",
                        progress: 100,
                    })
                    .show();
            }
        } catch (e) {
            ztoolkit.log("Export failed", e);
            new ztoolkit.ProgressWindow(addon.data.config.addonName)
                .createLine({
                    text: getString("review-export-failed"),
                    type: "error",
                    progress: 100,
                })
                .show();
        }
    }

    /**
     * 获取统计文本
     */
    private static getStatsText(): string {
        const allData = ReviewDataManager.getAllReviewData();
        const totalItems = allData.length;

        // 统计被纳入的条目数
        const fields = ReviewDataManager.getFields();
        const includedField = fields.find((f) => f.id === "included");
        let includedCount = 0;

        if (includedField) {
            includedCount = allData.filter((d) => d.fields["included"] === true).length;
        }

        return getString("review-stats", { args: { total: totalItems, included: includedCount } });
    }

    /**
     * 更新统计信息
     */
    private static updateStats() {
        const win = Zotero.getMainWindow();
        if (!win) return;

        const statsLabel = win.document.getElementById("review-stats-label") as XUL.Label;
        if (statsLabel) {
            statsLabel.setAttribute("value", this.getStatsText());
        }
    }
}
