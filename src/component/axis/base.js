const Util = require('../../util');
const { LabelsRenderer } = require('../label/index');
const { Group } = require('@ali/g');
const Grid = require('./grid');

class Base extends Group {
  getDefaultCfg() {
    return {
      /**
       * 唯一标识，用于动画
       * @type {[type]}
       */
      _id: null,
      zIndex: 4,
      /**
       * 坐标轴上的坐标点
       * @type {Array}
       */
      ticks: null,
      /**
       * 坐标轴线的图形属性配置，如果设置成null，则不显示
       * @type {Object}
       */
      line: null,
      /**
       * 刻度线的样式配置，如果设置成null，则不显示
       * @type {Object}
       */
      tickLine: null,
      /**
       * 次刻度线个数，如果未设置该属性，则不显示
       * @type {Number}
       */
      subTickCount: 0,
      /**
       * 次刻度线样式配置
       * @type {Object}
       */
      subTickLine: null,
      /**
       * 坐标轴栅格线样式配置，如果设置为 null，则不显示
       * @type {Object}
       */
      grid: null,
      /**
       * 坐标轴上的文本相关配置
       * @type {Object}
       */
      label: {
        textStyle: {}, // 文本样式配置
        autoRotate: true,
        formatter: null//  格式化坐标轴文本显示
      },
      /**
       * 坐标轴标题样式配置
       * @type {Object}
       */
      title: {
        autoRotate: true, // 自动旋转
        textStyle: {} // 标题文本样式配置
      },
      autoPaint: true // @type {Boolean} 是否自动绘制
    };
  }

  _beforeRenderUI() {
    // 添加默认样式
    const title = this.get('title');
    const label = this.get('label');
    const grid = this.get('grid');
    const textStyle = {
      fontSize: 12,
      fill: '#ccc',
      textAlign: 'center',
      textBaseline: 'middle'
    };
    if (title) {
      Util.defaultsDeep(title, {
        autoRotate: true,
        textStyle,
        offset: 40
      });
      this.setSilent('title', title);
    }
    if (label) {
      Util.defaultsDeep(label, {
        autoRotate: true,
        textStyle,
        offset: 10
      });
      this.setSilent('label', label);
    }
    if (grid) {
      Util.defaultsDeep(grid, {
        lineStyle: {
          lineWidth: 1,
          stroke: '#C0D0E0'
        }
      });
      this.setSilent('grid', grid);
    }
  }

  _renderUI() {
    const labelCfg = this.get('label');
    if (labelCfg) {
      this.renderLabels();
    }
    if (this.get('autoPaint')) {
      this.paint();
    }
    if (!Util.isNil(this.get('title'))) {
      this.renderTitle();
    }
    this.sort();
  }

  _parseTicks(ticks) {
    ticks = ticks || [];
    const ticksLength = ticks.length;
    for (let i = 0; i < ticksLength; i++) {
      const item = ticks[i];
      if (!Util.isObject(item)) {
        ticks[i] = this.parseTick(item, i, ticksLength);
      }
    }
    this.set('ticks', ticks);
    return ticks;
  }

  _addTickItem(index, point, length, type = '') {
    let tickItems = this.get('tickItems');
    let subTickItems = this.get('subTickItems');
    const end = this.getTickEnd(point, length, index);

    const cfg = {
      x1: point.x,
      y1: point.y,
      x2: end.x,
      y2: end.y
    };

    if (!tickItems) {
      tickItems = [];
    }

    if (!subTickItems) {
      subTickItems = [];
    }

    if (type === 'sub') {
      subTickItems.push(cfg);
    } else {
      tickItems.push(cfg);
    }

    this.set('tickItems', tickItems);
    this.set('subTickItems', subTickItems);
  }

  _renderLine() {
    let lineCfg = this.get('line');
    let path;
    if (lineCfg) {
      path = this.getLinePath();
      lineCfg = Util.mix({
        path
      }, lineCfg);
      const lineShape = this.addShape('path', {
        attrs: lineCfg
      });
      lineShape.name = 'axis-line';
      this.set('lineShape', lineShape);
    }
  }

  _processTicks() {
    const self = this;
    const labelCfg = self.get('label');
    const subTickCount = self.get('subTickCount');
    const tickLineCfg = self.get('tickLine');
    let ticks = self.get('ticks');
    ticks = self._parseTicks(ticks);

    Util.each(ticks, function(tick, index) {
      const tickPoint = self.getTickPoint(tick.value, index);
      if (tickLineCfg) {
        self._addTickItem(index, tickPoint, tickLineCfg.length);
      }
      if (labelCfg) {
        self.addLabel(tick, tickPoint, index);
      }
    });

    if (subTickCount) { // 如果有设置次级分点，添加次级tick
      const subTickLineCfg = self.get('subTickLine');
      Util.each(ticks, function(tick, index) {
        if (index > 0) {
          let diff = tick.value - ticks[index - 1].value;
          diff = diff / (self.get('subTickCount') + 1);

          for (let i = 1; i <= subTickCount; i++) {
            const subTick = {
              text: '',
              value: index ? ticks[index - 1].value + i * diff : i * diff
            };

            const tickPoint = self.getTickPoint(subTick.value);
            let subTickLength;
            if (subTickLineCfg && subTickLineCfg.length) {
              subTickLength = subTickLineCfg.length;
            } else {
              subTickLength = parseInt(tickLineCfg.length * (3 / 5), 10);
            }
            self._addTickItem(i - 1, tickPoint, subTickLength, 'sub');
          }
        }
      });
    }
  }

  _addTickLine(ticks, lineCfg) {
    const self = this;
    const cfg = Util.mix({}, lineCfg);
    const path = [];
    Util.each(ticks, function(item) {
      path.push([ 'M', item.x1, item.y1 ]);
      path.push([ 'L', item.x2, item.y2 ]);
    });
    delete cfg.length;
    cfg.path = path;
    const tickShape = self.addShape('path', {
      attrs: cfg
    });
    tickShape.name = 'axis-ticks';
    tickShape._id = this.get('_id') + '-ticks'; // 每个 label 用 _id 唯一标识
    tickShape.set('coord', this.get('coord'));
  }

  _renderTicks() {
    const self = this;
    const tickItems = self.get('tickItems');
    const subTickItems = self.get('subTickItems');

    if (!Util.isEmpty(tickItems)) {
      const tickLineCfg = self.get('tickLine');
      self._addTickLine(tickItems, tickLineCfg);
    }

    if (!Util.isEmpty(subTickItems)) {
      const subTickLineCfg = self.get('subTickLine') || self.get('tickLine');
      self._addTickLine(subTickItems, subTickLineCfg);
    }
  }

  _renderGrid() {
    const grid = this.get('grid');
    if (!grid) {
      return;
    }

    if (this.get('start')) {
      grid.start = this.get('start');
    }
    grid.coord = this.get('coord');
    this.set('gridGroup', this.addGroup(Grid, grid));
  }

  paint() {
    this._renderLine();
    this._processTicks();
    this._renderTicks();
    this._renderGrid();
    const labelCfg = this.get('label');
    if (labelCfg && labelCfg.autoRotate) {
      this.autoRotateLabels();
    }
  }

  parseTick(tick, index, length) {
    return {
      text: tick,
      value: index / (length - 1)
    };
  }

  getTextAnchor(vector) {
    const ratio = Math.abs(vector.y / vector.x);
    let align;
    if (ratio >= 1) { // 上面或者下面
      align = 'center';
    } else {
      if (vector.x > 0) { // 右侧
        align = 'left';
      } else { // 左侧
        align = 'right';
      }
    }
    return align;
  }

  getMaxLabelWidth(labelsGroup) {
    const labels = labelsGroup.get('children');
    let max = 0;
    Util.each(labels, function(label) {
      const bbox = label.getBBox();
      const width = bbox.width;
      if (max < width) {
        max = width;
      }
    });
    return max;
  }

  remove() {
    super.remove();
    const gridGroup = this.get('gridGroup');
    gridGroup && gridGroup.remove();
    this.removeLabels();
  }

  /**
   * 旋转文本
   * @abstract
   * @return {[type]} [description]
   */
  autoRotateLabels() {}

  /**
   * 渲染坐标轴标题
   * @abstract
   * @return {[type]} [description]
   */
  renderTitle() {}

  /**
   * 获取坐标轴线的 path
   * @abstract
   * @return {[type]} [description]
   */
  getLinePath() {}

  /**
   * 获取tick在画布上的位置
   * @abstract
   * @return {[type]} [description]
   */
  getTickPoint() {}

  /**
   * 获取标示坐标点的线的终点
   * @abstract
   * @return {[type]} [description]
   */
  getTickEnd() {}

  /**
   * 获取距离坐标轴的向量
   * @abstract
   * @return {[type]} [description]
   */
  getSideVector() {}
}

Util.assign(Base.prototype, LabelsRenderer, {
  addLabel(tick, point, index) {
    const labelsGroup = this.get('labelsGroup');
    const label = {};
    let rst;

    if (labelsGroup) {
      const offset = this.get('label').offset || this.get('_labelOffset');
      const vector = this.getSideVector(offset, point, index);
      point = {
        x: point.x + vector[0],
        y: point.y + vector[1]
      };

      label.text = tick.text;
      label.x = point.x;
      label.y = point.y;
      label.textAlign = this.getTextAnchor(vector);
      rst = labelsGroup.addLabel(label);
      rst.name = 'axis-label';
      rst._id = this.get('_id') + '-' + tick.tickValue; // 每个 label 用 _id 唯一标识
      rst.set('coord', this.get('coord'));
    }
    return rst;
  }
});

module.exports = Base;
