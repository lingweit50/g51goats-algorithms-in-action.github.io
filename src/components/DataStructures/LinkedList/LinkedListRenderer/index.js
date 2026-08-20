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
    const sx = Number.isFinite(safeBox?.x)
      ? safeBox.x
      : 0;

    const sy = Number.isFinite(safeBox?.y)
      ? safeBox.y
      : 0;

    const sw = Number.isFinite(safeBox?.width)
      ? safeBox.width
      : containerWidth;

    const sh = Number.isFinite(safeBox?.height)
      ? safeBox.height
      : 240;

    const groupCx =
      bounds.minX + bounds.width / 2;

    const groupCy =
      bounds.minY + bounds.height / 2;

    const safeCx =
      sx + sw / 2;

    const safeCy =
      sy + sh / 2;

    let offX =
      safeCx - groupCx;

    let offY =
      safeCy - groupCy;

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

    return {
      offX,
      offY,
    };
  }

  renderData() {
    const { nodes, layout } = this.props.data;
    const list = [...nodes.values()];

    /*
     * Node dimensions.
     */
    const NODE_W = 50;
    const NODE_H = 20;

    /*
     * n.pos.x and n.pos.y are not the top-left
     * coordinates of the rendered node.
     */
    const NODE_LEFT_OFFSET = 60;
    const NODE_TOP_OFFSET = 10;

    /*
     * Space between each end of the arrow
     * and its corresponding node.
     *
     * [source]  ------->  [target]
     *         ^^       ^^
     *         2px      2px
     */
    const SOURCE_GAP = 2;
    const TARGET_GAP = 2;

    /*
     * Arrowhead dimensions.
     *
     * These coordinates scale together with
     * the nodes because the arrowhead is drawn
     * as an SVG polygon rather than an SVG marker.
     */
    const ARROW_HEAD_LENGTH = 4;
    const ARROW_HEAD_HALF_WIDTH = 3;

    /*
     * Node geometry helpers.
     */
    const nodeLeftX = n =>
      n.pos.x - NODE_LEFT_OFFSET;

    const nodeRightX = n =>
      nodeLeftX(n) + NODE_W;

    const nodeTopY = n =>
      n.pos.y - NODE_TOP_OFFSET;

    const nodeCenterX = n =>
      nodeLeftX(n) + NODE_W / 2;

    const nodeCenterY = n =>
      nodeTopY(n) + NODE_H / 2;

    /*
     * Find the point where a line leaving the
     * centre of a node intersects its rectangular
     * boundary.
     *
     * The point is then moved "gap" pixels outside
     * the rectangle.
     *
     * This lets the same function handle:
     *
     * source -> target
     *
     * and:
     *
     * target -> source
     *
     * It also works when nodes are positioned
     * diagonally during the merge sort animation.
     */
    const getOutsidePoint = (
      node,
      towardX,
      towardY,
      gap
    ) => {
      const cx = nodeCenterX(node);
      const cy = nodeCenterY(node);

      const dx = towardX - cx;
      const dy = towardY - cy;

      const distance = Math.hypot(dx, dy);

      if (distance === 0) {
        return {
          x: nodeRightX(node) + gap,
          y: cy,
        };
      }

      const halfW =
        NODE_W / 2;

      const halfH =
        NODE_H / 2;

      /*
       * Determine which side of the rectangle
       * the ray hits first.
       */
      const tx =
        Math.abs(dx) > 0
          ? halfW / Math.abs(dx)
          : Infinity;

      const ty =
        Math.abs(dy) > 0
          ? halfH / Math.abs(dy)
          : Infinity;

      const t =
        Math.min(tx, ty);

      /*
       * Point exactly on the rectangle boundary.
       */
      const boundaryX =
        cx + dx * t;

      const boundaryY =
        cy + dy * t;

      /*
       * Unit vector pointing from this node
       * towards the other node.
       */
      const ux =
        dx / distance;

      const uy =
        dy / distance;

      /*
       * Move outside the box by the requested gap.
       */
      return {
        x:
          boundaryX +
          ux * gap,

        y:
          boundaryY +
          uy * gap,
      };
    };

    /*
     * Construct the arrow shaft and arrowhead.
     *
     * The arrowhead is a normal SVG polygon.
     * This means it scales and moves with the
     * exact same transform as the arrow shaft
     * and nodes.
     */
    const getArrowGeometry = (
      x1,
      y1,
      x2,
      y2
    ) => {
      const dx =
        x2 - x1;

      const dy =
        y2 - y1;

      const length =
        Math.hypot(dx, dy);

      if (length === 0) {
        return null;
      }

      /*
       * Unit vector along the arrow.
       */
      const ux =
        dx / length;

      const uy =
        dy / length;

      /*
       * Perpendicular unit vector.
       *
       * This is used to give the triangular
       * arrowhead its width.
       */
      const px =
        -uy;

      const py =
        ux;

      /*
       * Do not allow the arrowhead to consume
       * most or all of a short arrow.
       *
       * Normally the head is 4 units long.
       *
       * For very short arrows it can occupy at
       * most 40% of the complete arrow length.
       */
      const effectiveHeadLength =
        Math.min(
          ARROW_HEAD_LENGTH,
          length * 0.4
        );

      /*
       * Centre of the base of the triangle.
       */
      const baseX =
        x2 -
        ux * effectiveHeadLength;

      const baseY =
        y2 -
        uy * effectiveHeadLength;

      /*
       * Two corners of the triangle base.
       */
      const leftX =
        baseX +
        px * ARROW_HEAD_HALF_WIDTH;

      const leftY =
        baseY +
        py * ARROW_HEAD_HALF_WIDTH;

      const rightX =
        baseX -
        px * ARROW_HEAD_HALF_WIDTH;

      const rightY =
        baseY -
        py * ARROW_HEAD_HALF_WIDTH;

      return {
        /*
         * Stop the shaft at the BASE of the
         * arrowhead rather than underneath it.
         */
        shaftPath:
          `M ${x1},${y1} ` +
          `L ${baseX},${baseY}`,

        /*
         * Triangle:
         *
         *       tip
         *        >
         *       /|
         *      / |
         * left   right
         */
        headPoints:
          `${x2},${y2} ` +
          `${leftX},${leftY} ` +
          `${rightX},${rightY}`,
      };
    };

    /*
     * Size of SVG drawing area.
     */
    const maxX =
      (
        list.length
          ? Math.max(
              ...list.map(n => n.pos.x)
            )
          : 0
      ) + NODE_W;

    const maxY =
      (
        list.length
          ? Math.max(
              ...list.map(n => n.pos.y)
            )
          : 0
      ) + NODE_H;

    /*
     * Node colour.
     */
    const variantClass = n => {
      switch (n.fillVariant) {
        case 'orange':
          return styles.variantOrange;

        case 'blue':
          return styles.variantBlue;

        case 'green':
          return styles.variantGreen;

        case 'red':
          return styles.variantRed;

        default:
          return styles.variantGray;
      }
    };

    const safeBox =
      layout?.safeBox ?? {
        x: 0,
        y: 24,
        width: Infinity,
        height: 240,
      };

    const tagBlockH =
      layout?.tagBlockH ?? 24;

    const bounds =
      this._getNodesBounds(
        list,
        tagBlockH
      );

    const containerWidth =
      this.props.width || 800;

    /*
     * Currently retained from the original
     * auto-positioning implementation.
     */
    this._getAutoOffset(
      bounds,
      safeBox,
      containerWidth
    );

    /*
     * Current fixed camera positioning.
     */
    const cameraTranslateX = -400;
    const cameraTranslateY = 0;

    return (
      <div className={styles.container}>
        <div
          className={styles.stage}
          style={{
            transform:
              `translate(` +
              `${cameraTranslateX}px,` +
              `${cameraTranslateY}px` +
              `) ` +
              `scale(${this.zoom})`,
          }}
        >
          {/* Arrow layer */}
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
            {list.map(n => {
              /*
               * No outgoing link or hidden node.
               */
              if (
                n.nextKey == null ||
                n.hidden
              ) {
                return null;
              }

              const to =
                nodes.get(n.nextKey);

              /*
               * Destination does not exist or is hidden.
               */
              if (
                !to ||
                to.hidden
              ) {
                return null;
              }

              /*
               * Centres of both nodes are used only
               * to determine the direction of the link.
               */
              const sourceCx =
                nodeCenterX(n);

              const sourceCy =
                nodeCenterY(n);

              const targetCx =
                nodeCenterX(to);

              const targetCy =
                nodeCenterY(to);

              /*
               * Start the arrow 2px OUTSIDE
               * the source node.
               */
              const source =
                getOutsidePoint(
                  n,
                  targetCx,
                  targetCy,
                  SOURCE_GAP
                );

              /*
               * Stop the arrow 2px BEFORE
               * the target node.
               *
               * The target's outside point is
               * calculated in the direction of
               * the source.
               */
              const target =
                getOutsidePoint(
                  to,
                  sourceCx,
                  sourceCy,
                  TARGET_GAP
                );

              const arrow =
                getArrowGeometry(
                  source.x,
                  source.y,
                  target.x,
                  target.y
                );

              if (!arrow) {
                return null;
              }

              return (
                <React.Fragment
                  key={`e-${n.key}-${to.key}`}
                >
                  {/* Arrow shaft */}
                  <path
                    d={arrow.shaftPath}
                    fill="none"
                    className={styles.edge}
                  />

                  {/* Arrowhead */}
                  <polygon
                    points={arrow.headPoints}
                    fill="#ff3b3b"
                  />
                </React.Fragment>
              );
            })}
          </svg>

          {/* Node layer */}
          <AnimateSharedLayout>
            {list.map(n => (
              !n.hidden && (
                <motion.div
                  key={n.key}
                  layout
                  className={[
                    styles.node,
                    variantClass(n),
                    n.hidden &&
                      styles.hidden,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    position: 'absolute',
                    left:
                      nodeLeftX(n),
                    top:
                      nodeTopY(n),
                    width:
                      NODE_W,
                    height:
                      NODE_H,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                >
                  <div
                    className={
                      styles.pill
                    }
                  >
                    <span
                      className={
                        styles.value
                      }
                    >
                      {n.value}
                    </span>

                    <span
                      className={
                        styles.cap
                      }
                    >
                      <i
                        className={
                          styles.dot
                        }
                      />
                    </span>
                  </div>

                  <div
                    className={
                      styles.vars
                    }
                  >
                    {n.variables.map(
                      v => (
                        <motion.div
                          layoutId={
                            `${n.key}-${v}`
                          }
                          key={v}
                          className={
                            styles.varBadge
                          }
                        >
                          {v}
                        </motion.div>
                      )
                    )}
                  </div>
                </motion.div>
              )
            ))}
          </AnimateSharedLayout>
        </div>

        <div
          className={
            styles.value
          }
        >
          {this.props.data.caption}
        </div>
      </div>
    );
  }
}

export default LinkedListRenderer;