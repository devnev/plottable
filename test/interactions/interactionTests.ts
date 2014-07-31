///<reference path="../testReference.ts" />

var assert = chai.assert;


function makeFakeEvent(x: number, y: number): D3.D3Event {
  return <D3.D3Event> <any> {
      dx: 0,
      dy: 0,
      clientX: x,
      clientY: y,
      translate: [x, y],
      scale: 1,
      sourceEvent: null,
      x: x,
      y: y,
      keyCode: 0,
      altKey: false
    };
}

function fakeDragSequence(anyedInteraction: any, startX: number, startY: number, endX: number, endY: number) {
  anyedInteraction._dragstart();
  d3.event = makeFakeEvent(startX, startY);
  anyedInteraction._drag();
  d3.event = makeFakeEvent(endX, endY);
  anyedInteraction._drag();
  anyedInteraction._dragend();
  d3.event = null;
}

describe("Interactions", () => {
  describe("PanZoomInteraction", () => {
    it("Pans properly", () => {
      // The only difference between pan and zoom is internal to d3
      // Simulating zoom events is painful, so panning will suffice here
      var xScale = new Plottable.Scale.Linear().domain([0, 11]);
      var yScale = new Plottable.Scale.Linear().domain([11, 0]);

      var svg = generateSVG();
      var dataset = makeLinearSeries(11);
      var renderer = new Plottable.Plot.Scatter(dataset, xScale, yScale);
      renderer.renderTo(svg);

      var xDomainBefore = xScale.domain();
      var yDomainBefore = yScale.domain();

      var interaction = new Plottable.Interaction.PanZoom(renderer, xScale, yScale);
      interaction.registerWithComponent();

      var hb = renderer.element.select(".hit-box").node();
      var dragDistancePixelX = 10;
      var dragDistancePixelY = 20;
      $(hb).simulate("drag", {
        dx: dragDistancePixelX,
        dy: dragDistancePixelY
      });

      var xDomainAfter = xScale.domain();
      var yDomainAfter = yScale.domain();

      assert.notDeepEqual(xDomainAfter, xDomainBefore, "x domain was changed by panning");
      assert.notDeepEqual(yDomainAfter, yDomainBefore, "y domain was changed by panning");

      function getSlope(scale: Plottable.Scale.Linear) {
        var range = scale.range();
        var domain = scale.domain();
        return (domain[1]-domain[0])/(range[1]-range[0]);
      };

      var expectedXDragChange = -dragDistancePixelX * getSlope(xScale);
      var expectedYDragChange = -dragDistancePixelY * getSlope(yScale);

      assert.closeTo(xDomainAfter[0]-xDomainBefore[0], expectedXDragChange, 1, "x domain changed by the correct amount");
      assert.closeTo(yDomainAfter[0]-yDomainBefore[0], expectedYDragChange, 1, "y domain changed by the correct amount");

      svg.remove();
    });
  });

  describe("XYDragBoxInteraction", () => {
    var svgWidth = 400;
    var svgHeight = 400;
    var svg: D3.Selection;
    var dataset: Plottable.DataSource;
    var xScale: Plottable.Abstract.QuantitativeScale;
    var yScale: Plottable.Abstract.QuantitativeScale;
    var renderer: Plottable.Abstract.XYPlot;
    var interaction: Plottable.Interaction.XYDragBox;

    var dragstartX = 20;
    var dragstartY = svgHeight-100;
    var dragendX = 100;
    var dragendY = svgHeight-20;
    var draghalfwidth = ~~((dragendX - dragstartX) / 2);
    var draghalfheight = ~~((dragendY - dragstartY) / 2)

    before(() => {
      svg = generateSVG(svgWidth, svgHeight);
      dataset = new Plottable.DataSource(makeLinearSeries(10));
      xScale = new Plottable.Scale.Linear();
      yScale = new Plottable.Scale.Linear();
      renderer = new Plottable.Plot.Scatter(dataset, xScale, yScale);
      renderer.renderTo(svg);
      interaction = new Plottable.Interaction.XYDragBox(renderer);
      interaction.registerWithComponent();
    });

    afterEach(() => {
      interaction.dragstart();
      interaction.drag();
      interaction.dragend();
      interaction.clearBox();
    });

    it("All callbacks are notified with appropriate data on drag", () => {
      var timesCalled = 0;
      interaction.dragstart(function(a: Plottable.SelectionArea) {
        timesCalled++;
        var expectedPixelArea = { x: dragstartX, y: dragstartY };
        assert.deepEqual(a, expectedPixelArea, "areaCallback called with null arg on dragstart");
      });
      interaction.dragend(function(a: Plottable.SelectionArea) {
        timesCalled++;
        var expectedPixelArea = {
          xMin: dragstartX,
          xMax: dragendX,
          yMin: dragstartY,
          yMax: dragendY
        };
        assert.deepEqual(a, expectedPixelArea, "areaCallback was passed the correct pixel area");
      });

      // fake a drag event
      fakeDragSequence((<any> interaction), dragstartX, dragstartY, dragendX, dragendY);

      assert.equal(timesCalled, 2, "drag callbacks are called twice");
    });

    it("Highlights and un-highlights areas appropriately", () => {
      fakeDragSequence((<any> interaction), dragstartX, dragstartY, dragendX, dragendY);
      var dragBoxClass = "." + (<any> Plottable.Interaction.XYDragBox).CLASS_DRAG_BOX;
      var dragBox = renderer.foregroundContainer.select(dragBoxClass);
      assert.isNotNull(dragBox, "the dragbox was created");
      var actualStartPosition = {x: parseFloat(dragBox.attr("x")), y: parseFloat(dragBox.attr("y"))};
      var expectedStartPosition = {x: Math.min(dragstartX, dragendX), y: Math.min(dragstartY, dragendY)};
      assert.deepEqual(actualStartPosition, expectedStartPosition, "highlighted box is positioned correctly");
      assert.equal(parseFloat(dragBox.attr("width")), Math.abs(dragstartX-dragendX), "highlighted box has correct width");
      assert.equal(parseFloat(dragBox.attr("height")), Math.abs(dragstartY-dragendY), "highlighted box has correct height");

      interaction.clearBox();
      var boxGone = dragBox.attr("width") === "0" && dragBox.attr("height") === "0";
      assert.isTrue(boxGone, "highlighted box disappears when clearBox is called");
    });

    describe("resize enabled", () => {
      var dragmidX = dragstartX + draghalfwidth;
      var dragmidY = dragstartY + draghalfheight;
      function test(dragstartX2: number, dragstartY2: number, expectedPixelArea: Plottable.SelectionArea) {
        var timesCalled = 0;

        // fake a drag event
        fakeDragSequence((<any> interaction), dragstartX, dragstartY, dragendX, dragendY);

        interaction.dragend(function(a: Plottable.SelectionArea) {
          timesCalled++;
          assert.deepEqual(a, expectedPixelArea)
        });

        // fake another drag event to resize the box.
        interaction.enableResize();
        fakeDragSequence((<any> interaction), dragstartX2, dragstartY2, dragmidX, dragmidY)
        assert.equal(timesCalled, 1, "drag callback not called");
      }

      it("from the top left", () => {
        test(dragstartX, dragendY, {
          xMin: dragmidX,
          yMin: dragstartY,
          xMax: dragendX,
          yMax: dragmidY
        });
      });

      it("from the top", () => {
        test(dragmidX, dragendY, {
          xMin: dragstartX,
          yMin: dragstartY,
          xMax: dragendX,
          yMax: dragmidY
        });
      });

      it("from the top right", () => {
        test(dragendX, dragendY, {
          xMin: dragstartX,
          yMin: dragstartY,
          xMax: dragmidX,
          yMax: dragmidY
        });
      });

      it("from the right", () => {
        test(dragendX, dragmidY, {
          xMin: dragstartX,
          yMin: dragstartY,
          xMax: dragmidX,
          yMax: dragendY
        });
      });

      it("from the bottom right", () => {
        test(dragendX, dragstartY, {
          xMin: dragstartX,
          yMin: dragmidY,
          xMax: dragmidX,
          yMax: dragendY
        });
      });

      it("from the bottom", () => {
        test(dragmidX, dragstartY, {
          xMin: dragstartX,
          yMin: dragmidY,
          xMax: dragendX,
          yMax: dragendY
        });
      });

      it("from the bottom left", () => {
        test(dragstartX, dragstartY, {
          xMin: dragmidX,
          yMin: dragmidY,
          xMax: dragendX,
          yMax: dragendY
        });
      });

      it("from the left", () => {
        test(dragstartX, dragmidY, {
          xMin: dragmidX,
          yMin: dragstartY,
          xMax: dragendX,
          yMax: dragendY
        });
      });
    });

    after(() => {
      svg.remove();
    });
  });

  describe("YDragBoxInteraction", () => {
    var svgWidth = 400;
    var svgHeight = 400;
    var svg: D3.Selection;
    var dataset: Plottable.DataSource;
    var xScale: Plottable.Abstract.QuantitativeScale;
    var yScale: Plottable.Abstract.QuantitativeScale;
    var renderer: Plottable.Abstract.XYPlot;
    var interaction: Plottable.Interaction.XYDragBox;

    var dragstartX = 20;
    var dragstartY = svgHeight-100;
    var dragendX = 100;
    var dragendY = svgHeight-20;
    var dragwidth = dragendX - dragstartX;
    var dragheight = dragendY - dragstartY;

    before(() => {
      svg = generateSVG(svgWidth, svgHeight);
      dataset = new Plottable.DataSource(makeLinearSeries(10));
      xScale = new Plottable.Scale.Linear();
      yScale = new Plottable.Scale.Linear();
      renderer = new Plottable.Plot.Scatter(dataset, xScale, yScale);
      renderer.renderTo(svg);
      interaction = new Plottable.Interaction.YDragBox(renderer);
      interaction.registerWithComponent();
    });

    afterEach(() => {
      interaction.dragstart();
      interaction.drag();
      interaction.dragend();
      interaction.clearBox();
    });

    it("All callbacks are notified with appropriate data when a drag finishes", () => {
      var timesCalled = 0;
      interaction.dragstart(function(a: Plottable.SelectionArea) {
        timesCalled++;
        var expectedPixelArea = { y: dragstartY };
        assert.deepEqual(a, expectedPixelArea, "areaCallback called with null arg on dragstart");
      })
      interaction.dragend(function(a: Plottable.SelectionArea) {
        timesCalled++;
        var expectedPixelArea = {
          yMin: dragstartY,
          yMax: dragendY
        };
        assert.deepEqual(a, expectedPixelArea, "areaCallback was passed the correct pixel area");
      });

      // fake a drag event
      fakeDragSequence((<any> interaction), dragstartX, dragstartY, dragendX, dragendY);

      assert.equal(timesCalled, 2, "drag callbacks area called twice");
    });

    it("Highlights and un-highlights areas appropriately", () => {
      fakeDragSequence((<any> interaction), dragstartX, dragstartY, dragendX, dragendY);
      var dragBoxClass = "." + (<any> Plottable.Interaction.XYDragBox).CLASS_DRAG_BOX;
      var dragBox = renderer.foregroundContainer.select(dragBoxClass);
      assert.isNotNull(dragBox, "the dragbox was created");
      var actualStartPosition = {x: parseFloat(dragBox.attr("x")), y: parseFloat(dragBox.attr("y"))};
      var expectedStartPosition = {x: 0, y: Math.min(dragstartY, dragendY)};
      assert.deepEqual(actualStartPosition, expectedStartPosition, "highlighted box is positioned correctly");
      assert.equal(parseFloat(dragBox.attr("width")), svgWidth, "highlighted box has correct width");
      assert.equal(parseFloat(dragBox.attr("height")), Math.abs(dragstartY-dragendY), "highlighted box has correct height");

      interaction.clearBox();
      var boxGone = dragBox.attr("width") === "0" && dragBox.attr("height") === "0";
      assert.isTrue(boxGone, "highlighted box disappears when clearBox is called");
    });

    describe("resizing enabled", () => {
      it("from the top", () => {
        var timesCalled = 0;

        // fake a drag event
        fakeDragSequence((<any> interaction), dragstartX, dragstartY, dragendX, dragendY);

        var dragstartX2 = dragstartX + ~~(dragwidth / 2);
        var dragstartY2 = dragstartY;
        var dragendX2 = dragstartX2;
        var dragendY2 = dragstartY + ~~(dragheight / 2);

        interaction.dragend(function(a: Plottable.SelectionArea) {
          timesCalled++;
          var expectedPixelArea = {
            yMin: dragendY2,
            yMax: dragendY
          };
          assert.deepEqual(a, expectedPixelArea)
        });

        // fake another drag event to resize the box.
        interaction.enableResize();
        fakeDragSequence((<any> interaction), dragstartX2, dragstartY2, dragendX2, dragendY2)
        assert.equal(timesCalled, 1, "drag callback not called");
      });

      it("from the bottom", () => {
        var timesCalled = 0;

        // fake a drag event
        fakeDragSequence((<any> interaction), dragstartX, dragstartY, dragendX, dragendY);

        var dragstartX2 = dragstartX + ~~(dragwidth / 2);
        var dragstartY2 = dragendY;
        var dragendX2 = dragstartX2;
        var dragendY2 = dragstartY2 - ~~(dragheight / 2);

        interaction.dragend(function(a: Plottable.SelectionArea) {
          timesCalled++;
          var expectedPixelArea = {
            yMin: dragstartY,
            yMax: dragendY2
          };
          assert.deepEqual(a, expectedPixelArea)
        });

        // fake another drag event to resize the box.
        interaction.enableResize();
        fakeDragSequence((<any> interaction), dragstartX2, dragstartY2, dragendX2, dragendY2)
        assert.equal(timesCalled, 1, "drag callback not called");
      });
    });

    after(() => {
      svg.remove();
    });
  });

  describe("KeyInteraction", () => {
    it("Triggers the callback only when the Component is moused over and appropriate key is pressed", () => {
      var svg = generateSVG(400, 400);
      // svg.attr("id", "key-interaction-test");
      var component = new Plottable.Abstract.Component();
      component.renderTo(svg);

      var code = 65; // "a" key
      var ki = new Plottable.Interaction.Key(component, code);

      var callbackCalled = false;
      var callback = () => {
        callbackCalled = true;
      };

      ki.callback(callback);
      ki.registerWithComponent();

      var $hitbox = $((<any> component).hitBox.node());

      $hitbox.simulate("keydown", { keyCode: code });
      assert.isFalse(callbackCalled, "callback is not called if component does not have mouse focus (before mouseover)");

      $hitbox.simulate("mouseover");

      $hitbox.simulate("keydown", { keyCode: code });
      assert.isTrue(callbackCalled, "callback gets called if the appropriate key is pressed while the component has mouse focus");

      callbackCalled = false;
      $hitbox.simulate("keydown", { keyCode: (code + 1) });
      assert.isFalse(callbackCalled, "callback is not called if the wrong key is pressed");

      $hitbox.simulate("mouseout");

      $hitbox.simulate("keydown", { keyCode: code });
      assert.isFalse(callbackCalled, "callback is not called if component does not have mouse focus (after mouseout)");

      svg.remove();
    });
  });
});
