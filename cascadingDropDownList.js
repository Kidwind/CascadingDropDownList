/*
 * Cascading DropDownList - 一个jQuery插件，用于将一个表单元素（通常为<input type="hidden" />）转换为
 *                          联动的下拉选择列表，用以实现类似于省、市、县联动的下拉列表。
 *
 * Copyright (c) 2010-2017 Kidwind
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *   http://www.appelsiini.net/projects/lazyload
 *
 * Version:  1.0.0
 *
 */
(function($){
	var dataKey = 'cascadingDropDownList';

	var methods = {
	    /*
	    * 获取指定索引位置的选择器的提示文本。
	    * */
		_getPromptText : function(obj, index){
			var promptText;
			var promptTexts = obj.settings.promptTexts;
			if(promptTexts && promptTexts != null && promptTexts.length > index)
				promptText = promptTexts[index];
			if(!promptText) promptText = obj.settings.customPromptText;
			if(promptText) return promptText.replace("{0}", index + 1);
			return "";
		},

        /*
        * 通过指定选择器获取该选择器在所有选择器中的位置索引。
        * */
		_getSelectorIndex : function(obj, selector)
		{
			for(var i = 0; i < obj.selectors.length; i++)
			{
				if(selector == obj.selectors[i]) return i;
			}
			return undefined;
		},

        /*
        * 清除指定索引位置之后的选择器的值。
        * */
		_clearAfterSelector : function(obj, index)
		{
			for(var i = index + 1; i < obj.selectors.length; i++)
				obj.selectors[i].options.length = 1;
		},

        /*
        * 获取指定选择器的当前选择项所对应的下级选项的数量。
        * */
		_getSelectorChildCount : function(selector)
		{
			var childCount = selector.options[selector.selectedIndex].childCount;   // childCount 值是在 _loadSelectorData 方法成功调用后设置的
			if(childCount) childCount = parseInt(childCount);
			if(isNaN(childCount)) return 0;
			return childCount;
		},

        /*
        * 根据指定的上级选择器的值，加载其下一级选择器的数据，如果不指定上级选择器，则加载第一级选择器的值。
        * */
		_loadSelectorData : function(obj, parentSelector, callback)
		{
			var index = -1;
			var parentValue = "";
			if(parentSelector)
			{
				index = methods._getSelectorIndex(obj, parentSelector);
				if(typeof(index) == "undefined") return;

				methods._clearAfterSelector(obj, index);
				parentValue = parentSelector.value;

				var childCount = methods._getSelectorChildCount(parentSelector);
				if(!(parentValue && parentValue != "" && childCount > 0))
					return;
			}
			else
				methods._clearAfterSelector(obj, index);

			index += 1;

			var selector = methods._ensureSelector(obj, index);

			if(!obj.settings.dataLoadUrl)
				return;
			selector.options[0].text = obj.settings.loadingText;
			selector.disabled = true;

			var d = {};
			d[obj.settings.parentIdParmKey] = parentValue;
			$.ajax({ dataType : "json", url : obj.settings.dataLoadUrl, data : d,
				success : function(d){
					for(var i = 0; i < d.length; i++)
					{
						var item = d[i];
						var option = document.createElement("option");
						option.text = item.text;
						option.value = item.value;
						option.childCount = item.childCount;
						selector.options.add(option);
					}

					selector.options[0].text = methods._getPromptText(obj, index);
					selector.disabled = false;

					if(callback)
						callback();
				},
				error : function(){
					selector.options[0].text = methods._getPromptText(obj, index);
					selector.disabled = false;
				}
			});
		},

        /*
        * 当选择器的值改变时触发的方法。
        * */
		_changeSelectItem : function(e){
			var obj = e.data;
			methods._loadSelectorData(obj, this);
			methods._syncValue(obj);
		},

        /*
        * 设置选择器的值。
        * */
		_setSelectorValue : function(obj, selector, value, callback)
		{
			selector.value = value;
			if(selector.selectedIndex == -1) selector.selectedIndex = 0;
			methods._loadSelectorData(obj, selector, callback);
		},

        /*
        * 将联动下拉选择列表的选择值同步到表单元素中。
        * */
		_syncValue : function(obj)
		{
			var value = "";
			for(var i = 0; i < obj.selectors.length; i++)
			{
				var selector = obj.selectors[i];
				var val = selector.value;

				if(val && val != "")
				{
					if(obj.settings.onlySelectLeaf)
					{
						var childCount = methods._getSelectorChildCount(selector);
						if(!(childCount > 0)) value = val;
					}
					else
						value = val;
				}
				else
					break;
			}

			methods._changeValue(obj, value);
		},

        /*
        * 根据联动下拉选择列表的值，获取每一级选择器的选择值。
        * */
		_loadPathValues : function(obj, val, callback)
		{
			if(!obj.settings.dataLoadUrl || !obj.settings.pathLoadUrl || !val)
			{
				callback([]);
				return;
			}

			var d = {};
			d[obj.settings.idParmKey] = val;
			$.getJSON(obj.settings.pathLoadUrl, d, function(d){
				if(d)
					callback(d);
			});
		},

        /*
        * 确保指定索引位置的选择器存在，如果不存在，则创建之，并返回。
        * */
		_ensureSelector : function(obj, index){
			for(var i = obj.selectors.length; i <= index; i++)
			{
				var selector = $("<select></select>").bind("change", obj, methods._changeSelectItem).append("<option value=\"\">" + methods._getPromptText(obj, i) + "</option>");
				obj.selectorContainer.append(selector);
				obj.selectors[i] = selector[0];
			}
			return obj.selectors[index];
		},

        /*
        * 逐级设置每一级选择器的值。
        * */
		_setValues : function(obj, values){
			if(!values || values.length <= 0)
			{
				methods._loadSelectorData(obj, undefined);
				return;
			}
			var i = 0;

			function _load(){
				if(i >= values.length)
					return;
				var value = values[i];
				var selector = methods._ensureSelector(obj, i);
				if(i == 0)
				{
					methods._loadSelectorData(obj, undefined, function(){
						methods._setSelectorValue(obj, selector, value, _load);
					});
				}
				else
					methods._setSelectorValue(obj, selector, value, _load);
				i++;
			}
			_load();
		},

        /*
        * 清除表单元素值，并关联清除相应选择器的选择值。
        * */
		_clearValue : function(obj){
			methods._changeValue(obj, "");
			if(obj.selectors && obj.selectors.length > 0)
				methods._setSelectorValue(obj, obj.selectors[0], "");
		},

        /*
        * 修改表单元素的值，并触发change事件。
        * */
		_changeValue : function(obj, value){
			var oval = obj.val();
			obj.val(value);
			if(oval != value)
				obj.trigger("change");
		},

        /*
        * 设置表单元素值，并关联的初始相应的选择器的选择值。
        * */
		_setValue : function(obj, value){
			methods._changeValue(obj, value);
			methods._initSelectorData(obj);
		},

        /*
        * 根据表单元素值，初始相应的选择器的选择值。
        * */
		_initSelectorData : function(obj){
			methods._loadPathValues(obj, obj.val(), function(values){ methods._setValues(obj, values); });
		},

        /*
        * 设置选择器选项数据加载的URL地址。
        * */
		_setDataLoadUrl : function(obj, url){
			obj.settings.dataLoadUrl = url;
			methods._initSelectorData(obj);
		},

		init : function(options){
			var settings = {
				selectorContainer: null,    // 所有下拉列表选择器的容器对象
				dataLoadUrl : "",            // 下拉选择列表选项数据的加载URL地址，返回值应为[{text: "text", value: "value", childCount: 1}, ...]
				pathLoadUrl : "",            // 根据联动下拉列表的值，获取每一级选择器所对应的选择值，返回值应为["selector1Value", "selector2Value", ..., "selectoNValue"]
				initSelectorAmount : 1,     // 初始选择器的数量
				onlySelectLeaf : false,     // 仅允许选择叶节点（如果选择的是非叶节点，则不会触发联动下拉列表值的更改）
				parentIdParmKey : 'pid',    // 加载选择器的选项值时请求dataLoadUrl时的上级选项的参数名称
				idParmKey : 'id',            // 获取每一级选择器所对应的选择值时请求pathLoadUrl的联动下拉列表的值的参数名称
				loadingText : "正在加载，请稍后...",    // 正在加载的提示文本
				customPromptText : "-请选择-",     // 选择器未选定任何值时的默认提示文本
				promptTexts : null           // 每一级选择器未选定任何值时的提示文本，为一个数组对象，如：["-省-", "-市-", "-县-"]
			};

			if (options) {
				$.extend(settings, options);
			}

			return this.each(function(i){
				var self = $(this),
					obj = self.data(dataKey);
				if(!obj){
					obj = self;
					obj.settings = settings;

					if(settings.selectorContainer)
						obj.selectorContainer = $(settings.selectorContainer);
					else {
						obj.selectorContainer = $("<div style=\"display:inline-block;*display:inline;\"></div>");
						obj.after(obj.selectorContainer);
					}

					obj.selectors = [];
					methods._ensureSelector(obj, settings.initSelectorAmount - 1);
					methods._initSelectorData(obj);

					obj.data(dataKey, obj);
				}
			});
		},

        /*
        * 清除联动下拉选择列表的值。
        * */
		clearValue : function(){
			return this.each(function(){
				var obj = $(this).data(dataKey);
				if(!obj)
					return;

				methods._clearValue(obj);
			});
		},

        /*
        * 设置联动下拉选择列表的值。
        * */
		setValue : function(val){
			return this.each(function(){
				var obj = $(this).data(dataKey);
				if(!obj)
					return;

				methods._setValue(obj, val);
			});
		},

        /*
        * 设置下拉选择列表选项数据的加载URL地址。
        * */
		setDataLoadUrl : function(url){
			return this.each(function(){
				var obj = $(this).data(dataKey);
				if(!obj)
					return;

				methods._setDataLoadUrl(obj, url);
			});
		},

		destroy : function(){
			return this.each(function(){
				var obj = $(this).data(dataKey);
				if(!obj)
					return;

				obj.removeData(dataKey);
				obj.selectorContainer.remove();
			});
		}
	};

	$.fn.cascadingDropDownList = function(method) {
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.cascadingDropDownList' );
		}
	};
})(jQuery);