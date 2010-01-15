package gov.usgs.gdp.helper;

import static org.junit.Assert.*;

import java.util.Enumeration;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

public class PropertyFactoryTest {

	@Test
	public final void testGetKeys() {
		Enumeration<Object> result = PropertyFactory.getKeys();
		assertNotNull(result);
		assertTrue(result.hasMoreElements());
	}

	@Test
	public final void testGetProperty() {
		String result = PropertyFactory.getProperty("does.not.exist");
		assertEquals("", result);
		
		result = PropertyFactory.getProperty("thredds.url.0");
		assertEquals("RUNOFF;http://runoff.cr.usgs.gov:8086/thredds/hydrologic_catalog.xml", result);
	}

	@Test
	public final void testSetProperty() {
		String result = PropertyFactory.getProperty("thredds.url.0");
		assertEquals("RUNOFF;http://runoff.cr.usgs.gov:8086/thredds/hydrologic_catalog.xml", result);	
		PropertyFactory.setProperty("thredds.url.0", "...");
		result = PropertyFactory.getProperty("thredds.url.0");
		assertEquals("...", result);
	}

}