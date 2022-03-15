import { moduleCheckPermission } from "@erxes/api-utils/src/permissions";
import { IContext } from "../../../connectionResolver";
import { putCreateLog } from "../../../logUtils";
import { IField, IFieldDocument, IFieldGroup } from "../../../models/definitions/fields";
import { IOrderInput } from "../../../models/Fields";

interface IFieldsEdit extends IField {
  _id: string;
}

interface IUpdateVisibleParams {
  _id: string;
  isVisible?: boolean;
  isVisibleInDetail?: boolean;
}

interface IFieldsGroupsEdit extends IFieldGroup {
  _id: string;
}

interface IFieldsBulkAddAndEditParams {
  contentType: string;
  contentTypeId: string;
  addingFields: IField[];
  editingFields: IFieldsEdit[];
}

const fieldMutations = {
  /**
   * Adds field object
   */
  async fieldsAdd(_root, args: IField, { user, models }: IContext) {
    const field = await models.Fields.createField({
      ...args,
      lastUpdatedUserId: user._id
    });

    await putCreateLog(
      {
        type: 'field',
        newData: args,
        object: field,
        description: `Field "${args.text}" has been created`
      },
      user
    );

    return field;
  },

  async fieldsBulkAddAndEdit(
    _root,
    args: IFieldsBulkAddAndEditParams,
    { user, models }: IContext
  ) {
    const { contentType, contentTypeId, addingFields, editingFields } = args;
    const temp: { [key: string]: string } = {};
    const response: IFieldDocument[] = [];
    const logicalFields: IField[] = [];

    if (!addingFields && !editingFields) {
      return;
    }

    for (const f of addingFields) {
      if (f.logics && f.logics.length > 0) {
        logicalFields.push(f);
        continue;
      }

      const tempId = f.tempFieldId;

      const field = await models.Fields.createField({
        ...f,
        contentType,
        contentTypeId,
        lastUpdatedUserId: user._id
      });

      if (tempId) {
        temp[tempId] = field._id;
      }
    }

    for (const f of logicalFields) {
      const logics = f.logics || [];

      for (const logic of logics) {
        if (f.logics && !logic.fieldId && logic.tempFieldId) {
          f.logics[logics.indexOf(logic)].fieldId = temp[logic.tempFieldId];
        }
      }

      const field = await models.Fields.createField({
        ...f,
        contentType,
        contentTypeId,
        lastUpdatedUserId: user._id
      });

      if (f.tempFieldId) {
        temp[f.tempFieldId] = field._id;
      }

      response.push(field);
    }

    for (const { _id, ...doc } of editingFields || []) {
      if (doc.logics) {
        for (const logic of doc.logics) {
          if (!logic.fieldId && logic.tempFieldId) {
            doc.logics[doc.logics.indexOf(logic)].fieldId =
              temp[logic.tempFieldId];
          }
        }
      }

      const field = await models.Fields.updateField(_id, {
        ...doc,
        lastUpdatedUserId: user._id
      });

      response.push(field);
    }

    return response;
  },

  /**
   * Updates field object
   */
  fieldsEdit(_root, { _id, ...doc }: IFieldsEdit, { user, models }: IContext) {
    return models.Fields.updateField(_id, { ...doc, lastUpdatedUserId: user._id });
  },

  /**
   * Remove a channel
   */
  fieldsRemove(_root, { _id }: { _id: string }, { models }: IContext) {
    return models.Fields.removeField(_id);
  },

  /**
   * Update field orders
   */
  fieldsUpdateOrder(_root, { orders }: { orders: IOrderInput[] }, { models }: IContext) {
    return models.Fields.updateOrder(orders);
  },

  /**
   * Update field's visible
   */
  fieldsUpdateVisible(
    _root,
    { _id, isVisible, isVisibleInDetail }: IUpdateVisibleParams,
    { user, models }: IContext
  ) {
    return models.Fields.updateFieldsVisible(
      _id,
      user._id,
      isVisible,
      isVisibleInDetail
    );
  }
};

const fieldsGroupsMutations = {
  /**
   * Create a new group for fields
   */
  async fieldsGroupsAdd(
    _root,
    doc: IFieldGroup,
    { user, docModifier, models }: IContext
  ) {
    // if (doc.boardsPipelines) {
    //   doc = getBoardsAndPipelines(doc);
    // }

    const fieldGroup = await models.FieldsGroups.createGroup(
      docModifier({ ...doc, lastUpdatedUserId: user._id })
    );

    await putCreateLog(
      {
        type: 'field_group',
        newData: doc,
        object: fieldGroup,
        description: `Field group "${doc.name}" has been created`
      },
      user
    );

    return fieldGroup;
  },

  /**
   * Update group for fields
   */
  fieldsGroupsEdit(
    _root,
    { _id, ...doc }: IFieldsGroupsEdit,
    { user, models }: IContext
  ) {
    // ? if (doc.boardsPipelines) {
    //   doc = getBoardsAndPipelines(doc);
    // }

    return models.FieldsGroups.updateGroup(_id, {
      ...doc,
      lastUpdatedUserId: user._id
    });
  },

  /**
   * Remove group
   */
  fieldsGroupsRemove(_root, { _id }: { _id: string }, { models }: IContext) {
    return models.FieldsGroups.removeGroup(_id);
  },

  /**
   * Update field group's visible
   */
  fieldsGroupsUpdateVisible(
    _root,
    { _id, isVisible, isVisibleInDetail }: IUpdateVisibleParams,
    { user, models }: IContext
  ) {
    return models.FieldsGroups.updateGroupVisible(
      _id,
      user._id,
      isVisible,
      isVisibleInDetail
    );
  },

  /**
   * Update field group's visible
   */
  fieldsGroupsUpdateOrder(_root, { orders }: { orders: IOrderInput[] }, { models }: IContext) {
    return models.FieldsGroups.updateOrder(orders);
  }
};

moduleCheckPermission(fieldMutations, 'manageForms');
moduleCheckPermission(fieldsGroupsMutations, 'manageForms');

export { fieldsGroupsMutations, fieldMutations };
