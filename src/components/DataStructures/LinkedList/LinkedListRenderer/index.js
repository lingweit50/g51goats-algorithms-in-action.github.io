import React from 'react';
import { motion, AnimateSharedLayout } from 'framer-motion';
import Array2DRenderer from '../../Array/Array2DRenderer';
import styles from './LinkedListRenderer.module.scss';

/**
 * LinkedListRenderer
 * Pointer-only linked list visualization with auto-centering and arrows.
 */
class LinkedListRenderer extends Array2DRenderer {
  constructor(props) {
    super(props);
    this.togglePan(true);
    this.toggleZoom(true);
  }

  _getNodesBounds(list, tagBlockH = 24) {
    const visible = list.filter(n => !n.hidden);

    if (!visible.length) {
      return {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0,
      };
    }

    const NODE_W = 50;
    const NODE_H = 20;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    visible.forEach(n => {
      const left = n.pos.x - 60;
      const top = n.pos.y - 10;
      const right = left + NODE_W;
      const bottom = top + NODE_H + 6 + tagBlockH;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    });

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  _getAutoOffset(bounds, safeBox, containerWidth) {
    const sx = Number.isFinite(safeBox?.x) ? safeBox.x : 0;
    const sy = Number.isFinite(safeBox?.y) ? safeBox.y : 0;

    const sw = Number.isFinite(safeBox?.width)
      ? safeBox.width
      : containerWidth;

    const sh = Number.isFinite(safeBox?.height)
      ? safeBox.height
      : 240;

    const groupCx = bounds.minX + bounds.width / 2;
    const groupCy = bounds.minY + bounds.height / 2;

    const safeCx = sx + sw / 2;
    const safeCy = sy + sh / 2;

    let offX = safeCx - groupCx;
    let offY = safeCy - groupCy;

    const after = {
      minX: bounds.minX + offX,
      maxX: bounds.maxX + offX,
      minY: bounds.minY + offY,
      maxY: bounds.maxY + offY,
    };

    if (after.minX < sx) {
      offX += sx - after.minX;
    }

    if (after.maxX > sx + sw) {
      offX -= after.maxX - (sx + sw);
    }

    if (after.minY < sy) {
      offY += sy - after.minY;
    }

    if (after.maxY > sy + sh) {
      offY -= after.maxY - (sy + sh);
    }

    return { offX, offY };
  }

  renderData() {
    const { nodes, layout } = this.props.data;
    const list = [...nodes.values()];

    /*
     * Node:
     *
     * ┌────────────────────┬────────┐
     * │       VALUE        │  HEAD  │
     * │                    │   •    │
     * └────────────────────┴────────┘
     *
     * NODE_W  = 50
     * CAP_W   = 15
     * VALUE_W = 35
     */

    const NODE_W = 50;
    const NODE_H = 20;
    const CAP_W = 15;
    const VALUE_W = NODE_W - CAP_W;

    /*
     * Leave a tiny gap after the source head box.
     *
     * The destination gap is deliberately 0 so that
     * the arrowhead tip reaches the actual boundary
     * of the destination value box.
     */
    const START_GAP = 2;
    const END_GAP = 0;

    /*
     * Get the rectangular area occupied by the
     * HEAD / pointer portion of a node.
     */
    const getHeadRect = n => {
      const nodeLeft = n.pos.x - 60;
      const nodeTop = n.pos.y - NODE_H / 2;

      return {
        left: nodeLeft + VALUE_W,
        right: nodeLeft + NODE_W,
        top: nodeTop,
        bottom: nodeTop + NODE_H,
      };
    };

    /*
     * Get the rectangular area occupied by the
     * VALUE portion of a node.
     */
    const getValueRect = n => {
      const nodeLeft = n.pos.x - 60;
      const nodeTop = n.pos.y - NODE_H / 2;

      return {
        left: nodeLeft,
        right: nodeLeft + VALUE_W,
        top: nodeTop,
        bottom: nodeTop + NODE_H,
      };
    };

    /*
     * Centre of the source HEAD section.
     */
    const getHeadCenter = n => {
      const nodeLeft = n.pos.x - 60;

      return {
        x: nodeLeft + VALUE_W + CAP_W / 2,
        y: n.pos.y,
      };
    };

    /*
     * Centre of the destination VALUE section.
     */
    const getValueCenter = n => {
      const nodeLeft = n.pos.x - 60;

      return {
        x: nodeLeft + VALUE_W / 2,
        y: n.pos.y,
      };
    };

    /*
     * Find the point where a line travelling from
     * "from" toward "toward" exits the given rectangle.
     *
     * This means arrows correctly leave or enter through
     * the appropriate side of a node even when diagonal.
     */
    const getRectBoundaryPoint = (rect, from, toward) => {
      const dx = toward.x - from.x;
      const dy = toward.y - from.y;

      if (dx === 0 && dy === 0) {
        return {
          x: from.x,
          y: from.y,
        };
      }

      let tx = Infinity;
      let ty = Infinity;

      if (dx > 0) {
        tx = (rect.right - from.x) / dx;
      } else if (dx < 0) {
        tx = (rect.left - from.x) / dx;
      }

      if (dy > 0) {
        ty = (rect.bottom - from.y) / dy;
      } else if (dy < 0) {
        ty = (rect.top - from.y) / dy;
      }

      const t = Math.min(tx, ty);

      return {
        x: from.x + dx * t,
        y: from.y + dy * t,
      };
    };

    const maxX =
      (list.length
        ? Math.max(...list.map(n => n.pos.x))
        : 0) + NODE_W;

    const maxY =
      (list.length
        ? Math.max(...list.map(n => n.pos.y))
        : 0) + NODE_H;

    const getPath = (x1, y1, x2, y2) =>
      `M ${x1},${y1} L ${x2},${y2}`;

    const variantClass = n => {
      switch (n.fillVariant) {
        case 0:
          return styles.variantSky;

        case 1:
          return styles.variantLeaf;

        case 2:
          return styles.variantApple;

        case 3:
          return styles.variantPeach;

        default:
          return styles.variantStone;
      }
    };

    const safeBox =
      layout?.safeBox ?? {
        x: 0,
        y: 24,
        width: Infinity,
        height: 240,
      };

    const tagBlockH = layout?.tagBlockH ?? 24;

    const bounds = this._getNodesBounds(
      list,
      tagBlockH
    );

    const containerWidth =
      this.props.width || 800;

    const { offX, offY } =
      this._getAutoOffset(
        bounds,
        safeBox,
        containerWidth
      );

    // const cameraTranslateX =
    //   (-this.centerX * 2) + offX - 100;

    // const cameraTranslateY =
    //   (-this.centerY * 2) + offY - 30;

    const cameraTranslateX = -400;
    const cameraTranslateY = 0;

    return (
      <div className={styles.container}>
        <div
          className={styles.stage}
          style={{
            transform:
              `translate(${cameraTranslateX}px, ` +
              `${cameraTranslateY}px) ` +
              `scale(${this.zoom})`,
          }}
        >

          {/* ========================= */}
          {/* ARROW LAYER               */}
          {/* ========================= */}

          <svg
            className={styles.edges}
            width={maxX}
            height={maxY}
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              overflow: 'visible',
              background: 'transparent',
            }}
          >
            <defs>
              <marker
                id="arrow-dark"
                viewBox="0 0 5 8"
                markerUnits="userSpaceOnUse"
                markerWidth={6}
                markerHeight={9}
                refX={5}
                refY={4}
                orient="auto"
              >
                <path
                  d="M0,0 L5,4 L0,8 Z"
                  fill="#ff3b3b"
                />
              </marker>
            </defs>

            {list.map(n => {
              /*
               * No pointer if there is no next node.
               */
              if (!n.nextKey || n.hidden) {
                return null;
              }

              const to = nodes.get(n.nextKey);

              if (!to || to.hidden) {
                return null;
              }

              /*
               * Arrow must travel:
               *
               * source HEAD
               *     ↓
               * destination VALUE
               */
              const sourceHead =
                getHeadRect(n);

              const targetValue =
                getValueRect(to);

              const sourceCenter =
                getHeadCenter(n);

              const targetCenter =
                getValueCenter(to);

              /*
               * Exact point at which the line leaves
               * the source HEAD rectangle.
               */
              const startBoundary =
                getRectBoundaryPoint(
                  sourceHead,
                  sourceCenter,
                  targetCenter
                );

              /*
               * Exact point at which the arrow reaches
               * the destination VALUE rectangle.
               */
              const endBoundary =
                getRectBoundaryPoint(
                  targetValue,
                  targetCenter,
                  sourceCenter
                );

              /*
               * Direction from source boundary
               * to destination boundary.
               */
              const dx =
                endBoundary.x -
                startBoundary.x;

              const dy =
                endBoundary.y -
                startBoundary.y;

              const length =
                Math.sqrt(
                  dx * dx +
                  dy * dy
                );

              const ux =
                length
                  ? dx / length
                  : 0;

              const uy =
                length
                  ? dy / length
                  : 0;

              /*
               * START_GAP moves the tail slightly away
               * from the source node.
               */
              const x1 =
                startBoundary.x +
                ux * START_GAP;

              const y1 =
                startBoundary.y +
                uy * START_GAP;

              /*
               * END_GAP is zero.
               *
               * Therefore the SVG path terminates at
               * the exact boundary of the destination
               * VALUE box.
               *
               * Since refX is the tip of the marker,
               * the arrowhead tip sits at this exact
               * endpoint rather than appearing pushed
               * backwards along short arrows.
               */
              const x2 =
                endBoundary.x -
                ux * END_GAP;

              const y2 =
                endBoundary.y -
                uy * END_GAP;

              return (
                <motion.path
                  key={`e-${n.key}-${to.key}`}
                  initial={false}
                  animate={{
                    d: getPath(
                      x1,
                      y1,
                      x2,
                      y2
                    ),
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                  fill="none"
                  markerEnd="url(#arrow-dark)"
                  className={styles.edge}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {/* ========================= */}
          {/* NODE LAYER                */}
          {/* ========================= */}

          <AnimateSharedLayout>
            {list.map(n => (
              !n.hidden && (
                <motion.div
                  key={n.key}
                  layout
                  className={[
                    styles.node,
                    variantClass(n),
                    n.hidden && styles.hidden,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    position: 'absolute',
                    left: n.pos.x - 60,
                    top: n.pos.y - 10,
                    width: NODE_W,
                    height: NODE_H,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                >
                  <div
                    className={styles.pill}
                  >
                    <span
                      className={styles.value}
                    >
                      {n.value}
                    </span>

                    <span
                      className={styles.cap}
                    >
                      <i
                        className={styles.dot}
                      />
                    </span>
                  </div>

                  <div
                    className={styles.vars}
                  >
                    {n.variables.map(v => (
                      <motion.div
                        layoutId={`${n.key}-${v}`}
                        key={v}
                        className={[
                          styles.varBadge,
                          v === 'M' &&
                            styles.mBadge,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {v}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )
            ))}
          </AnimateSharedLayout>
        </div>

        <div className={styles.value}>
          {this.props.data.caption}
        </div>
      </div>
    );
  }
}

export default LinkedListRenderer;