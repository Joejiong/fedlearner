import { Job, Variable, VariableAccessMode, VariableComponent } from 'typings/workflow'
import { FormilySchema } from 'typings/formily'
import VariableLabel from 'components/VariableLabel/index'
import { merge } from 'lodash'
import variablePresets from './variablePresets'

//---- Variable to Schema private helpers --------

function _getPermissions({ access_mode }: Variable) {
  return {
    readOnly: access_mode === VariableAccessMode.PEER_READABLE,
    display: access_mode !== VariableAccessMode.PRIVATE,
  }
}

function _getDatas({ value, widget_schema: { type, options } }: Variable) {
  if (options?.type === 'static') {
  }
  return {
    type,
    default: value,
    enum: options,
  }
}

function _getUIs({
  name,
  widget_schema: { size, placeholder, index, label, tooltip, description },
}: Variable) {
  return {
    title: label ? VariableLabel({ label, tooltip }) : name,
    description,
    'x-index': index,
    'x-component-props': {
      size,
      placeholder,
    },
  }
}

function _getValidations({ widget_schema: { pattern, rules } }: Variable) {
  return {
    pattern,
    'x-rules': rules,
  }
}

//---- Form Schema Workers --------
export function createInput(variable: Variable): FormilySchema {
  const {
    name,
    widget_schema: { prefix, suffix, showCount, maxLength },
  } = variable

  return {
    [name]: merge(
      _getUIs(variable),
      _getDatas(variable),
      _getPermissions(variable),
      _getValidations(variable),
      {
        'x-component': 'Input',
        'x-component-props': {
          // check here for more Input props:
          // https://ant.design/components/input/#Input
          prefix,
          suffix,
          showCount,
          maxLength,
          allowClear: true,
        },
      },
    ),
  }
}

export function createTextArea(variable: Variable): FormilySchema {
  const {
    name,
    widget_schema: { rows, showCount, maxLength },
  } = variable

  return {
    [name]: merge(
      _getUIs(variable),
      _getDatas(variable),
      _getPermissions(variable),
      _getValidations(variable),
      {
        'x-component': 'TextArea',
        'x-component-props': {
          rows,
          showCount,
          maxLength,
        },
      },
    ),
  }
}

export function createSelect(variable: Variable): FormilySchema {
  const {
    name,
    widget_schema: { options, filterOption, multiple },
  } = variable

  return {
    [name]: merge(
      _getUIs(variable),
      _getDatas(variable),
      _getPermissions(variable),
      _getValidations(variable),
      {
        enum: options?.source || [],
        'x-component': 'Select',
        'x-component-props': {
          // check here for more Select props:
          // https://ant.design/components/select
          allowClear: true,
          filterOption: filterOption,
          mode: multiple ? 'multiple' : null,
        },
      },
    ),
  }
}

export function createSwitch(variable: Variable): FormilySchema {
  const {
    name,
    widget_schema: { checkedChildren, unCheckedChildren },
  } = variable

  return {
    [name]: merge(
      _getUIs(variable),
      _getDatas(variable),
      _getPermissions(variable),
      _getValidations(variable),
      {
        'x-component': 'Switch',
        'x-component-props': {
          checkedChildren,
          unCheckedChildren,
        },
      },
    ),
  }
}

export function createCheckbox(variable: Variable): FormilySchema {
  const {
    name,
    widget_schema: { options },
  } = variable

  return {
    [name]: merge(
      _getUIs(variable),
      _getDatas(variable),
      _getPermissions(variable),
      _getValidations(variable),
      {
        enum: options?.source || [],
        'x-component': 'Checkbox',
      },
    ),
  }
}

export function createRadio(variable: Variable): FormilySchema {
  const {
    name,
    widget_schema: { options },
  } = variable

  return {
    [name]: merge(
      _getUIs(variable),
      _getDatas(variable),
      _getPermissions(variable),
      _getValidations(variable),
      {
        enum: options?.source || [],
        'x-component': 'Radio',
      },
    ),
  }
}

export function createNumberPicker(variable: Variable): FormilySchema {
  const {
    name,
    widget_schema: { min, max, formatter, parser },
  } = variable

  return {
    [name]: merge(
      _getUIs(variable),
      _getDatas(variable),
      _getPermissions(variable),
      _getValidations(variable),
      {
        'x-component': 'NumberPicker',
        'x-component-props': {
          min,
          max,
          formatter,
          parser,
        },
      },
    ),
  }
}

export function createUpload(variable: Variable): FormilySchema {
  const {
    name,
    widget_schema: { accept, action, multiple },
  } = variable

  return {
    [name]: merge(
      _getUIs(variable),
      _getDatas(variable),
      _getPermissions(variable),
      _getValidations(variable),
      {
        'x-component': 'Upload',
        'x-component-props': {
          // force to use dragger-upload
          listType: 'dragger',
          accept,
          action,
          multiple,
        },
      },
    ),
  }
}

// ---- Component to Workers map --------
const componentToWorkersMap: { [key: string]: (v: Variable) => FormilySchema } = {
  [VariableComponent.Input]: createInput,
  [VariableComponent.Checkbox]: createCheckbox,
  [VariableComponent.TextArea]: createTextArea,
  [VariableComponent.Switch]: createSwitch,
  [VariableComponent.Select]: createSelect,
  [VariableComponent.Radio]: createRadio,
  [VariableComponent.NumberPicker]: createNumberPicker,
  [VariableComponent.Upload]: createUpload,
}

/**
 * Merge server side variable.widget_schema with client side's preset
 * NOTE: server side's config should always priority to client side!
 */
function mergeVariableSchemaWithPresets(variable: Variable) {
  return Object.assign(variablePresets[variable.name] || {}, variable.widget_schema)
}

/** Return a formily acceptable schema by server job definition */
export function buildFormFromJobDef(job: Job): FormilySchema {
  const { variables, name } = job

  const schema: FormilySchema = {
    type: 'object',
    title: name,
    properties: {},
  }

  return variables.reduce((schema, current, index) => {
    const worker = componentToWorkersMap[current.widget_schema.component]

    current.widget_schema = mergeVariableSchemaWithPresets(current)
    current.widget_schema.index = index

    Object.assign(schema.properties, worker(current))

    return schema
  }, schema)
}
