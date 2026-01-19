/**
 * 列管理器对话框
 * 允许用户添加、编辑和删除自定义评审字段
 */

import { ReviewDataManager, ReviewField } from "./reviewData";
import { getString } from "../utils/locale";

export class ColumnManagerFactory {
    /**
     * 打开列管理对话框
     */
    static async openColumnManager() {
        const dialogData: { [key: string | number]: any } = {
            fields: [...ReviewDataManager.getFields()],
            loadCallback: () => {
                ztoolkit.log("Column Manager Opened");
            },
            unloadCallback: () => {
                ztoolkit.log("Column Manager Closed");
            },
        };

        const dialogHelper = new ztoolkit.Dialog(1, 2)
            .addCell(0, 0, {
                tag: "div",
                namespace: "html",
                styles: {
                    display: "flex",
                    flexDirection: "column",
                    width: "600px",
                    height: "400px",
                    padding: "10px",
                },
                children: [
                    {
                        tag: "h2",
                        styles: {
                            marginBottom: "10px",
                        },
                        properties: {
                            innerHTML: "管理评审字段",
                        },
                    },
                    {
                        tag: "div",
                        styles: {
                            flex: "1",
                            overflow: "auto",
                            border: "1px solid #ccc",
                            padding: "10px",
                            marginBottom: "10px",
                        },
                        id: "fields-container",
                    },
                    {
                        tag: "button",
                        namespace: "html",
                        attributes: {
                            type: "button",
                        },
                        styles: {
                            padding: "8px 16px",
                            alignSelf: "flex-start",
                        },
                        properties: {
                            innerHTML: "添加新字段",
                        },
                        listeners: [
                            {
                                type: "click",
                                listener: () => {
                                    this.addNewField(dialogData);
                                    this.renderFields(dialogHelper, dialogData);
                                },
                            },
                        ],
                    },
                ],
            })
            .addButton("保存", "save")
            .addButton("取消", "cancel")
            .setDialogData(dialogData)
            .open("列管理器");

        // 初始渲染字段列表
        this.renderFields(dialogHelper, dialogData);

        await dialogData.unloadLock.promise;

        // 如果用户点击保存
        if (dialogData._lastButtonId === "save") {
            ReviewDataManager.setFields(dialogData.fields);

            new ztoolkit.ProgressWindow(addon.data.config.addonName)
                .createLine({
                    text: "字段配置已保存",
                    type: "success",
                    progress: 100,
                })
                .show();

            // 刷新评审表格
            const { ReviewTabFactory } = require("./reviewTab");
            await ReviewTabFactory.refreshTable();
        }
    }

    /**
     * 渲染字段列表
     */
    private static renderFields(
        dialogHelper: any,
        dialogData: { [key: string]: any }
    ) {
        const doc = dialogHelper.window.document;
        const container = doc.getElementById("fields-container");
        if (!container) return;

        container.innerHTML = "";

        dialogData.fields.forEach((field: ReviewField, index: number) => {
            const fieldElement = this.createFieldElement(
                doc,
                field,
                index,
                dialogData,
                dialogHelper
            );
            container.appendChild(fieldElement);
        });
    }

    /**
     * 创建字段元素
     */
    private static createFieldElement(
        doc: Document,
        field: ReviewField,
        index: number,
        dialogData: { [key: string]: any },
        dialogHelper: any
    ): HTMLElement {
        const fieldDiv = doc.createElement("div");
        fieldDiv.style.display = "flex";
        fieldDiv.style.flexDirection = "column";
        fieldDiv.style.marginBottom = "15px";
        fieldDiv.style.padding = "10px";
        fieldDiv.style.border = "1px solid #ddd";
        fieldDiv.style.borderRadius = "4px";

        // 字段名称输入
        const nameDiv = doc.createElement("div");
        nameDiv.style.marginBottom = "8px";

        const nameLabel = doc.createElement("label");
        nameLabel.textContent = "字段名称: ";
        nameLabel.style.display = "inline-block";
        nameLabel.style.width = "80px";
        nameDiv.appendChild(nameLabel);

        const nameInput = doc.createElement("input");
        nameInput.type = "text";
        nameInput.value = field.name;
        nameInput.style.width = "300px";
        nameInput.addEventListener("input", () => {
            dialogData.fields[index].name = nameInput.value;
        });
        nameDiv.appendChild(nameInput);

        fieldDiv.appendChild(nameDiv);

        // 字段类型选择
        const typeDiv = doc.createElement("div");
        typeDiv.style.marginBottom = "8px";

        const typeLabel = doc.createElement("label");
        typeLabel.textContent = "字段类型: ";
        typeLabel.style.display = "inline-block";
        typeLabel.style.width = "80px";
        typeDiv.appendChild(typeLabel);

        const typeSelect = doc.createElement("select");
        typeSelect.style.width = "150px";

        const types = [
            { value: "text", label: "文本" },
            { value: "select", label: "下拉选项" },
            { value: "number", label: "数字" },
            { value: "date", label: "日期" },
            { value: "boolean", label: "是/否" },
        ];

        types.forEach((type) => {
            const option = doc.createElement("option");
            option.value = type.value;
            option.textContent = type.label;
            if (field.type === type.value) {
                option.selected = true;
            }
            typeSelect.appendChild(option);
        });

        typeSelect.addEventListener("change", () => {
            dialogData.fields[index].type = typeSelect.value;
            this.renderFields(dialogHelper, dialogData);
        });

        typeDiv.appendChild(typeSelect);
        fieldDiv.appendChild(typeDiv);

        // 如果是选择类型,显示选项配置
        if (field.type === "select") {
            const optionsDiv = doc.createElement("div");
            optionsDiv.style.marginBottom = "8px";

            const optionsLabel = doc.createElement("label");
            optionsLabel.textContent = "选项: ";
            optionsLabel.style.display = "inline-block";
            optionsLabel.style.width = "80px";
            optionsLabel.style.verticalAlign = "top";
            optionsDiv.appendChild(optionsLabel);

            const optionsTextarea = doc.createElement("textarea");
            optionsTextarea.rows = 3;
            optionsTextarea.style.width = "300px";
            optionsTextarea.value = (field.options || []).join("\n");
            optionsTextarea.placeholder = "每行一个选项";
            optionsTextarea.addEventListener("input", () => {
                dialogData.fields[index].options = optionsTextarea.value
                    .split("\n")
                    .filter((opt) => opt.trim());
            });
            optionsDiv.appendChild(optionsTextarea);

            fieldDiv.appendChild(optionsDiv);
        }

        // 删除按钮
        const deleteBtn = doc.createElement("button");
        deleteBtn.textContent = "删除此字段";
        deleteBtn.style.alignSelf = "flex-end";
        deleteBtn.style.padding = "4px 12px";
        deleteBtn.style.backgroundColor = "#d32f2f";
        deleteBtn.style.color = "white";
        deleteBtn.style.border = "none";
        deleteBtn.style.borderRadius = "3px";
        deleteBtn.style.cursor = "pointer";

        deleteBtn.addEventListener("click", () => {
            // @ts-ignore - confirm is available in browser context
            if (confirm(`确定要删除字段"${field.name}"吗？这将删除所有条目中该字段的数据。`)) {
                dialogData.fields.splice(index, 1);
                this.renderFields(dialogHelper, dialogData);
            }
        });

        fieldDiv.appendChild(deleteBtn);

        return fieldDiv;
    }

    /**
     * 添加新字段
     */
    private static addNewField(dialogData: { [key: string]: any }) {
        const newField: ReviewField = {
            id: ReviewDataManager.generateId(),
            name: "新字段",
            type: "text",
            defaultValue: "",
        };
        dialogData.fields.push(newField);
    }
}
