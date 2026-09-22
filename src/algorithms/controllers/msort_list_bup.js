/**
 * XXX rewrite document for bup
 *
 * XXX getting this into shape gradually. Some comments below are out of
 * date (eg, we don't hide lists).  Needs more work to apply colour
 * scheme used elsewhere, pretty up a few things and improve how list
 * variables are shown (plus the interface to the list tracer) - see
 * list_interface file.
 *
 * Merge Sort Linked List Animation — Bookmark & Chunker Guide
 * -----------------------------------------------------------
 *
 * This file implements the animated merge sort process for a linked list
 * using a direct mapping between the algorithm pseudocode and chunked
 * animation steps.
 *
 * Every chunker.add() call corresponds to a pseudocode "bookmark" label:
 *   - \\B <BookmarkName>  in the pseudocode
 *   - chunker.add('<BookmarkName>', ...) in this file
 *
 * Maintaining a 1:1 mapping ensures:
 *   1) The animation always follows the exact published algorithm flow
 *   2) The step navigation UI correctly aligns with algorithm theory
 *
 * -----------------------------------------------------------
 * How to Add or Modify Animation Steps
 * -----------------------------------------------------------
 * 1. Open the pseudocode in: src/algorithms/pseudocode/msort_list_td.js
 *    Search for \\B or \\Ref to find the canonical bookmark name.
 *
 * 2. Add (or update) a chunker.add() step in this file
 *    The bookmark string must match exactly.
 *
 * -----------------------------------------------------------
 * Tags and Pointers Used
 * -----------------------------------------------------------
 * L   Remaining left sublist to merge
 * R   Remaining right sublist to merge
 * M   First element of the merged chain (head of result)
 * E   Current end of merged chain (tail pointer)
 *
 * -----------------------------------------------------------
 * Colors
 * -----------------------------------------------------------
 * Currently being used in LinkedListTracer directly, if want to
 * make coloring functions generic there, will need to pass in color
 * here in every coloring function call.
 *
 * runA   Orange = current L chain
 * runB   Blue = current R chain
 * merged Green = already merged portion (M..E)
 * cmp    Red = elements under comparison (heads of L and R)
 * def    Gray = default/idle color
 *
 * Important:
 *   Do visual updates after pointer updates.
 *   Call vis.list.updateConnections(T) after mutating Tails.
 *
 * -----------------------------------------------------------
 * Bookmark → Visual Mapping
 * -----------------------------------------------------------
 * Bookmark              UI
 * -----------------------------------------------------------
 * Main                  Show full list initially
 * len>1                 Check for recursion condition
 * Mid                   Place Mid pointer at head (start scan)
 * MidNext               Move Mid to its tail during split scan
 * R<-tail(Mid)          Show R starting at Mid.tail
 * tail(Mid)<-Null       Visually split list at Mid
 *
 * preSortL              Focus on L (hide right)
 * sortL                 Show sorted result of left recursion
 * preSortR              Focus on R (hide left)
 * sortR                 Show sorted result of right recursion
 *
 * compareHeads          Highlight L.head and R.head for comparison
 * M<-L                  Set merged head from L
 * L<-tail(L)            Advance pointer L after selecting L.head
 * M<-R                  Set merged head from R
 * R<-tail(R)            Advance pointer R after selecting R.head
 *
 * E                     Initialize E = M
 * whileNotNull          Loop while both lists still have elements
 * findSmaller           Decide which list contributes next element
 *
 * E.tail<-L             Append L.head to merged chain
 * E<-L                  Move E to follow appended element
 * popL                  Advance L after append
 *
 * E.tail<-R             Append R.head to merged chain
 * E<-R                  Move E to follow appended element
 * popR                  Advance R after append
 *
 * appendR               Append remaining R when L is Null
 * appendL               Append remaining L when R is Null
 *
 * returnM               Final merged list returned upward recursion
 *
 * -----------------------------------------------------------
 * Notes
 * -----------------------------------------------------------
 * • Each mutation of (L, R, E, M, Tails) must be followed by a chunk.
 * • Avoid adding chunks that do not exist in the pseudocode.
 *
 * If pseudocode changes, update the chunk order to match.
 */


import { msort_list_bup } from '../explanations';
import LinkedListTracer from '../../components/DataStructures/LinkedList/LinkedListTracer';
import {colors} from "../../components/DataStructures/colors";


// ---------- Colors ----------
const apColor = colors.apple;   // heads under comparison
const runAColor = colors.peach; // current L chain
const runBColor = colors.sky;   // current R chain
const sortColor = colors.leaf;  // already sorted portion
const doneColor = colors.stone; // default/idle color

// Internal data arrays encoding the linked list structure (NOT UI, don't delete)
let Heads;        // ['i.head (data)', ...]
let Tails;        // ['i.tail (next)', ...]


// ---------- Init visualiser (pointer only) ----------
export function initVisualisers() {
  return {
    list: {
      instance: new LinkedListTracer('list', null, 'List(s)'),
      order: 0,
    },
  }
}

export function run_msort() {
  // XXX could temporarily use depth = 0 (before complete rewrite) as there's no recursion for bup
  return function run(chunker, { nodes }) {
    const entire_num_array = nodes;
    // const  = []; // [ [left, right,  depth], ...]  (although depth could be implicit this is easier)
    // const  = []; // [ [left, right,  depth], ...]

    // XXX derived_stack function need to be rewritten to match bup (see msort_list_td)
    // XXX same with refresh_stack (due to usage of recursion)

    // kept, same as msort_list_td, per pseudocode
    function initializeListStructure() {
      Heads = ['i.head (data)'];
      Tails = ['i.tail (next)'];
      for (let i = 1; i <= entire_num_array.length; i++) {
        Heads.push(entire_num_array[i - 1]);
        Tails.push(i + 1);
      }
      Tails[entire_num_array.length] = 'Null';
    }

    // XXX need to be rewritten to replace recursion with iterative (remove depth)
    function setupInitialVisualization(L, len) {
      chunker.add('Main', (vis, T, cur_L, cur_len) => {
        // Show full original list (top-level call)
        vis.list.set(entire_num_array, 'mergeSort list init');
      
        // XXX should colour list the cur_L colour and *remove* the
        // colour from the previous cur_L, if any
        // vis.list.showChain(cur_L, T);
        vis.list.resetColors(doneColor);
        vis.list.colorChain(cur_L, runAColor, T);
        vis.list.setCaption(`len = ${cur_len}`);

        // Just L tag is known at this point
        vis.list.assignTag('L', cur_L);

      }, [Tails, L, len]);

      // This corresponds to pseudocode bookmark:
      // \B len<1 — later checked before recursion happens
      chunker.add('len<1', () => { }, []);
    }

    // Must be implemented
    // Splits list L into a list of single element lists LL
    // Need clarification on how LL looks like
    // Should it be i.head (data): i.head(data), i.head (data)
    // or should it be i.head (data): [values], [values]
    function init_LL(L){
      console.log("Start INIT")
      // Bookmark: T <- L.tail
      let T = Tails[L];
      chunker.add('init_T', () => { }, []);

      let LL = Heads;
      chunker.add('init_LL', () => { }, []);

      L = T
      chunker.add('use_T', () => { }, []);

      let LR = LL
      chunker.add('init_LR_1', () => { }, []);


      for (let i = 1; i <= entire_num_array.length; i++){
        console.log(`
                  LR: ${LR}\n,
                  LL: ${LL}\n,
                  L: ${L}\n,
                  T: ${T}\n,
                  Tails: ${Tails}\n,
                  Heads: ${Heads}
                  `)

        chunker.add('WhileL', () => { }, []);

        T = Tails[L]
        chunker.add('init_T_1', () => { }, []);

        Tails[LR] = [Heads[L]] // WRONG
        chunker.add('assign_LRtail', () => { }, []);

        L = T
        chunker.add('use_T_1', () => { }, []);

        LR = Tails[LR] // WRONG
        chunker.add('assign_LR', () => { }, []);
      }

      console.log(`LR: ${LR}\n,
                  LL: ${LL}`)
      console.log("End INIT")
      return LL;
    }

    // // Must be implemented
    // // Performs the main sorting operations
    function MergeAll(LL){
      // Temp M
      let M= 1;

      let LR = LL;
      chunker.add('init_LR', () => { }, []);
      
      // Placeholder length, L, and R must also be replaced.
      // Must be replaced, refer to pseudocode to understand what value to place here. 
      let tempLength = 2
      while (tempLength > 1){
        chunker.add('MergeAllWhile', () => { }, []);

        let L = 1
        chunker.add('init L', () => { }, []);

        let R = 2
        chunker.add('init R', () => { }, []);

        M = Merge(L, R)
        tempLength -= 1
      }
      chunker.add('returnM', () => { }, []);
      chunker.add('replace_head', () => { }, []);
      chunker.add('skip_second', () => { }, []);
      chunker.add('next_pair', () => { }, []);
      chunker.add('mergeDone', () => { }, []);
      return M
    }

    function Merge(L, R){
      let M = init_M(L ,R)

      chunker.add('E', () => { }, []);

      // Temp while loop, need to fix implementation
      let tempLength = 1
      while(tempLength > 0){
      chunker.add('whileNotNull', () => { }, []);
        CopySmaller()
        CopyRest();
        tempLength -= 1
      }

      return M
    }

    // Must be implemented
    function init_M(L, R){
      let M = 1;
      chunker.add('compareHeads', () => { }, []);
      if (Heads[L] < Heads[R]){
    //     M = L;
        chunker.add('M<-L', () => { }, []);

    //     L = Tails[L];
        chunker.add('L<-tail(L)', () => { }, []);
      } else {
    //     M = R;
        chunker.add('M<-R', () => { }, []);

    //     R = Tails[R];
        chunker.add('R<-tail(R)', () => { }, []);
      }
      return M;
    }

    // Must be implemented
    function CopySmaller(){
      chunker.add('findSmaller', () => { }, []);
      chunker.add('E.tail<-L', () => { }, []);
      chunker.add('E<-L', () => { }, []);
      chunker.add('popL', () => { }, []);
      chunker.add('E.tail<-R', () => { }, []);
      chunker.add('E<-R', () => { }, []);
      chunker.add('popR', () => { }, []);
    }


    // Must be implemented
    function CopyRest(){
      chunker.add('appendR', () => { }, []);
      chunker.add('appendL', () => { }, []);
    }
    // // XXX main merge sort function, need to be rewritten almost all of it
    // // current code is unchanged from msort_list_td
    // Must be implemented
    function MergeSort(L, len) {
      setupInitialVisualization(L, len);

      let result;
      // If initial list is 1 element return it
      if (len < 2) {     
        chunker.add('returnL', (vis, _T, cur_L) => {
          vis.list.assignTag('Mid', undefined);
          vis.list.assignTag('R', undefined);
          vis.list.assignTag('R', undefined);

          vis.list.resetColors(doneColor);
          vis.list.colorMerged(cur_L, cur_L, Tails, sortColor);
          }, [Tails, L]);
          result = L;
          return result;
      }

      // Create LL from L. Divide
      let LL = init_LL(L);
      
      // Temporary length storage. Remove once implementation is complete
      // Use LL.length instead
      // While LL > 1. merge
      // Merge consecutive pairs. Conquer
      let tempLength = LL.length
      while (tempLength > 1) {
        chunker.add('MainWhile', () => {}, []);
        MergeAll(LL);
        tempLength -= 1
      }
      // result = Heads[LL]
      // chunker.add('Done', () => {}, []);
  
      return result;
    }

    // ---- main ----
    initializeListStructure();

    // XXX hack to allow BUP pseudocode to be displayed
    // before we just return
    // delete this after implementation
    // if (entire_num_array.length >= 0) { chunker.add('Main'); return;}

    const msresult = MergeSort(1, entire_num_array.length);

    // reset pointer colors once (array UI removed)
    const lastLine = (entire_num_array.length > 1 ? 'returnM' : 'returnL');
    chunker.add(lastLine, (vis) => {
      vis.list.resetColors();
    }, [], 1);

    return msresult;
  }
}

export default {
  explanation: msort_list_bup,
  initVisualisers,
  run: run_msort()
};
